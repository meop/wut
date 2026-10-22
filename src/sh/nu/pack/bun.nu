# `bun info` and `bun pm cache` are built on bun's installer, which walks up from the cwd for a package.json and
# refuses when it finds none — no flag turns that off (--no-save, --dry-run, -c and --silent all still refuse),
# and neither takes `--global`. so where wut was run from decided whether they answered at all, and which
# project they answered about.
#
# they run from bun's global project instead, the one `--global` installs into: bun puts it under $BUN_INSTALL,
# else $XDG_CACHE_HOME/.bun, else ~/.bun, plus install/global. bun creates it on the first global add and errors
# until then — `bun pm bin -g` included, so it cannot even be asked where it is — and it keeps whatever manifest
# it finds there, writing only its own `dependencies` into it. so wut seeds the empty one bun would have written
def packBunRoot [] {
  if 'BUN_INSTALL' in $env {
    $env.BUN_INSTALL
  } else if 'XDG_CACHE_HOME' in $env {
    [$env.XDG_CACHE_HOME '.bun'] | path join
  } else {
    [($env.HOME? | default $nu.home-dir) '.bun'] | path join
  }
}

def packBunProject [] {
  let dir = ([(packBunRoot) install global] | path join)
  let manifest = ([$dir 'package.json'] | path join)
  if not ($manifest | path exists) {
    mkdir $dir
    '{}' | save --force $manifest
  }
  $dir
}

# bun's global "project" (package.json) is lazily created on first successful add; until then, or if an add
# ever fails partway (writes package.json but not the lockfile), list/update/remove/cache commands against it
# error out even though nothing being installed is a perfectly normal state, not a real problem. that one error
# is swallowed; every other one is reported, which is why bun runs its own commands rather than packOp's
def --env packBunRun [cmds: list<string>, --read]: nothing -> string {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  # quoted: a bare word inside parens is an external command call, see docs/NUSHELL.md
  if (not $read) and ('NOOP' in $env) {
    return ''
  }
  let prev = $env.PWD
  cd (packBunProject)
  let result = (run-external ($cmds | first) ...($cmds | skip 1) | complete)
  cd $prev
  if $result.exit_code == 0 {
    return $result.stdout
  }
  if not (($result.stderr | str contains 'No package.json') or ($result.stderr | str contains 'Lockfile not found')) {
    opPrintErr $result.stderr
  }
  ''
}

def --env packBun [] {
  let cmd = 'bun'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd add --force --global]
    }
    info => {
      for term in (packInfoNames) {
        packDoIn (packBunProject) [$cmd info $term]
      }
    }
    list => {
      let out = (packBunRun (packListCmd $cmd) --read)
      let names = (packNameList 'PACK_LIST_NAMES')
      if ($names | is-empty) {
        print $out
      } else {
        for term in $names {
          $out | lines | where { |l| wutWordMatch $l $term } | each { |l| print $l }
        }
      }
    }
    remove => {
      packOpRemove [$cmd remove --global]
    }
    sync => {
      if ((packNameList 'PACK_SYNC_NAMES') | is-not-empty) {
        packOpSync [$cmd update --force --global --latest] [$cmd update --force --global --latest]
      } else {
        packBunRun [$cmd update --force --global --latest]
      }
    }
    tidy => {
      packBunRun [$cmd pm cache rm]
    }
  }
}

# bun runs no package itself: a global add links the package's own command into bun's bin dir, and a command that
# starts `#!/usr/bin/env node` runs on whichever node PATH finds — --bun reaches only a script bun launches. a bun
# holding one runs it on another install's node. read from the links, so a bun with no global project yet has
# nothing to say; windows has no links, and no shebangs, so there is nothing to read there either
def --env packBunHeld [] {
  let bin = ([(packBunRoot) bin] | path join)
  if not ($bin | path exists) {
    return (packHeld)
  }
  let onNode = (ls -l $bin | where type == symlink | each { |l|
    let target = ($l.name | path expand)
    # a command that is not text has no shebang to read
    let line = (try {
      open --raw $target | bytes at 0..200 | decode utf-8 | lines | get -o 0 | default ''
    } catch { |e| opRethrowInterrupt $e; '' })
    if ($line =~ '^#!.*\bnode\b') {
      let parts = ($target | path split)
      let at = ($parts | enumerate | where item == 'node_modules' | last | get index)
      let rest = ($parts | skip ($at + 1))
      if ($rest | first | str starts-with '@') { $rest | first 2 | str join '/' } else { $rest | first }
    }
  } | compact | uniq | sort)
  if ($onNode | is-empty) {
    return (packBunShadowed $bin)
  }
  let names = ($onNode | str join ' ')
  let what = if ($onNode | length) == 1 { 'a package runs' } else { 'packages run' }
  packHeld '' $"($what) on node, not bun" [$names $"bun remove --global ($names)" $"pnpm add --global ($names)"]
}

# the rest start `#!/usr/bin/env bun`, so they run on the bun PATH finds first: a copy further down PATH is updating
# packages another bun runs
def --env packBunShadowed [bin: string] {
  let bun = (which bun | get -o 0.path)
  let shellBun = (packShellWhich bun)
  let held = (ls -l $bin | where type == symlink | is-not-empty)
  if $held and $shellBun != $bun {
    return (packHeld '' 'its packages run on another bun' [$"bun ($bun)" $"PATH's bun ($shellBun)"])
  }
  packHeld
}
