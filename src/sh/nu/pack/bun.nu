# `bun info` and `bun pm cache` are built on bun's installer, which walks up from the cwd for a package.json and
# refuses when it finds none — no flag turns that off (--no-save, --dry-run, -c and --silent all still refuse),
# and neither takes `--global`. so where wut was run from decided whether they answered at all, and which
# project they answered about.
#
# they run from bun's global project instead, the one `--global` installs into: bun puts it under $BUN_INSTALL,
# else $XDG_CACHE_HOME/.bun, else ~/.bun, plus install/global. bun creates it on the first global add and errors
# until then — `bun pm bin -g` included, so it cannot even be asked where it is — and it keeps whatever manifest
# it finds there, writing only its own `dependencies` into it. so wut seeds the empty one bun would have written
def packBunProject [] {
  let root = if 'BUN_INSTALL' in $env {
    $env.BUN_INSTALL
  } else if 'XDG_CACHE_HOME' in $env {
    [$env.XDG_CACHE_HOME '.bun'] | path join
  } else {
    [($env.HOME? | default $nu.home-dir) '.bun'] | path join
  }
  let dir = ([$root install global] | path join)
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
          $out | lines | where { |l| $l | str contains --ignore-case $term } | each { |l| print $l }
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
