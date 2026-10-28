# paru and yay are aur helpers wrapping pacman: one manager wearing three names
const PACK_PACMAN_FAMILY = ['paru', 'yay', 'pacman']

# a manager's own failure stays inside its try; a ctrl-c or an abnormal end (negative exit code) does not
const PACK_TRY_CATCH = r#'catch { |e| if ($e.exit_code? | default 0) < 0 or ($e.exit_code? == 130) or ($e.debug | str starts-with 'Interrupted ') { $e.raw } }'#

def --env packDo [cmds: list<string>] {
  opPrintCmd try '{' ...$cmds '}'
  opRunCmd try '{' ...$cmds '}' $PACK_TRY_CATCH
}

def packElevate [cmd: string] {
  if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $cmd }
}

def --env packFiltered [cmds: list<string>, names: list<string>] {
  if ($names | is-empty) {
    packDo $cmds
    return
  }
  for term in $names {
    packDo ($cmds ++ ['|' ansi strip '|' find --regex $"r#'(wutWordPattern $term)'#"])
  }
}

# the check is shown, its output is not: the answer is the exit code, and the output would bury the plan
# a few of these tools decide what a command means by looking for a project file in the cwd, so an op that is
# about the machine answers differently depending on where you were standing when you ran wut. those run from a
# directory picked for them, and the cwd is put back afterwards
def --env packDoIn [dir: string, cmds: list<string>] {
  let prev = $env.PWD
  cd $dir
  packDo $cmds
  cd $prev
}

# a command run for its answer. one the os will not start at all answers as a failed one, with no exit code, so a
# manager it belongs to never ends the run: on windows over ssh, rustup's symlinked proxies are refused (os error 448)
def --env packComplete [cmds: list<string>] {
  try {
    run-external ($cmds | first) ...($cmds | skip 1) | complete
  } catch { |e|
    opRethrowInterrupt $e
    # an io error carries the os's reason only in its debug form; a missing command, in its label
    let why = ($e.debug | parse --regex 'AdditionalContext\("(?<m>[^"]+)"\)' | get -o 0.m
      | default ($e.details?.labels? | default [] | get -o 0.text) | default $e.msg)
    { stdout: '', stderr: $why, exit_code: null }
  }
}

# a listing that could not start says so, rather than reading as a manager that holds nothing
def --env packCompleteListing [cmds: list<string>] {
  let res = (packComplete $cmds)
  if $res.exit_code == null {
    opPrintWarn $"($cmds | first) did not start: ($res.stderr)"
  }
  $res
}

def --env packOk [cmds: list<string>] {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  (packComplete $cmds | get exit_code) == 0
}

# bun, pnpm and deno all ask npm about the same name, so the round trip is made once and the answer kept
def --env packHttpOk [url: string] {
  let cached = ($env.PACK_FETCHED? | default [] | where key == $url | get -o 0.answer)
  if $cached != null {
    return $cached
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd 'http get' $url
  let res = (try { http get --full --redirect-mode follow $url } catch { |e| opRethrowInterrupt $e; null })
  let answer = (($res != null) and ($res.status == 200))
  load-env {PACK_FETCHED: (($env.PACK_FETCHED? | default []) | append { key: $url, answer: $answer })}
  $answer
}

# by name, not by search: the registries answer 404 for a name that does not exist
def --env packExistsNpm [name: string] {
  packHttpOk $"https://registry.npmjs.org/($name)"
}

def --env packExistsJsr [name: string] {
  if not ($name | str starts-with '@') {
    return false
  }
  let parts = ($name | str substring 1.. | split row '/')
  if ($parts | length) != 2 {
    return false
  }
  packHttpOk $"https://api.jsr.io/scopes/($parts | get 0)/packages/($parts | get 1)"
}

def packPypiUrl [name: string] {
  $"https://pypi.org/pypi/($name)/json"
}

def --env packExistsPypi [name: string] {
  packHttpOk (packPypiUrl $name)
}

# uv has no info command of its own. an installed tool is a venv it can be asked about, and anything else is a
# question for pypi — which is where uv would have got it — rather than an error about missing virtualenvs
def --env packPypiInfo [name: string] {
  let url = (packPypiUrl $name)
  $env.PACK_PRINTED = '1'
  opPrintCmd 'http get' $url
  let res = (try { http get --raw --redirect-mode follow $url | from json } catch { |e| opRethrowInterrupt $e; null })
  if $res == null {
    opPrintWarn $"not on pypi: ($name)"
    return
  }
  let info = ($res.info? | default {})
  opPrint $"($info.name? | default $name) ($info.version? | default '')"
  for line in [($info.summary? | default ''), ($info.home_page? | default ''), ($info.license? | default '')] {
    if ($line | is-not-empty) {
      opPrint $"  ($line)"
    }
  }
}

# scoop dispatches subcommands with `& $cmd_path`, so a subcommand's `exit 1` ends only that nested script and
# scoop.ps1 still completes 0. the code survives only as $LASTEXITCODE, which -Command exits with
# https://github.com/ScoopInstaller/Scoop/issues/3936
def packScoopCmd [] {
  ['powershell' '-NoProfile' '-Command' 'scoop']
}

# choosing a manager needs an exact name, not the substring search 'find' runs: pacman has nushell, not nushel
def --env packExists [manager: string, raw: string] {
  let parts = (packNameParts $raw)
  let name = $parts.name
  let flags = $parts.flags
  if ($name | is-empty) {
    return false
  }
  match $manager {
    # --non-interactive: an inherited tty (wut's own) would otherwise pass ghpm's isatty
    # check, letting an unresolved name fall through to an interactive search-and-pick prompt
    # mid-plan instead of just failing
    ghpm => (packOk [ghpm info $name --non-interactive]),
    cargo => (packOk [cargo info $name]),
    uv => (packExistsPypi $name),
    # bun and pnpm are npm clients; jsr is deno's own registry, so it answers there first
    pnpm => (packExistsNpm $name),
    npm => (packExistsNpm $name),
    # rubygems and nuget answer 404 for a name they have never had
    rv => (packHttpOk $"https://rubygems.org/api/v1/gems/($name).json"),
    dotnet => (packHttpOk $"https://api.nuget.org/v3-flatcontainer/($name | str lowercase)/index.json"),
    bun => ((packExistsNpm $name) or (packExistsJsr $name)),
    deno => ((packExistsJsr $name) or (packExistsNpm $name)),
    go => (packExistsGo $name),
    brew => (packOk ([brew info] ++ $flags ++ [$name])),
    apk => (packOk [apk search -e $name]),
    apt => (packOk [apt-cache show $name]),
    dnf => (packOk [dnf info $name]),
    # a bare name in two categories (tree) answers nothing, so packs name emerge's packages whole: dev-vcs/git
    emerge => (packOk [portageq best_visible / $name]),
    yay => (packOk [yay --sync --info $name]),
    paru => (packOk [paru --sync --info $name]),
    pacman => (packOk [pacman --sync --info $name]),
    xbps => (packOk [xbps-query --repository --show $name]),
    zypper => (packOk [zypper --non-interactive info $name]),
    nix => (packOk [nix eval --raw $"(packNixInstallable $name).name"]),
    choco => (packOk [choco info $name]),
    scoop => (packOk ((packScoopCmd) ++ [info $name])),
    winget => (packOk [winget show --exact --id $name]),
    _ => false,
  }
}

# the listing is printed like any other check, its output read rather than swallowed: these managers answer by
# what they name, not by an exit code. a listing is run once per run and remembered: a plan resolving five names
# against uv asked `uv tool list` five times and printed it five times, for one answer that could not have changed
def --env packListedNames [cmds: list<string>, keep: closure] {
  let key = $"($env.PACK_COPY? | default '')|($cmds | str join ' ')"
  let cached = ($env.PACK_LISTED? | default [] | where key == $key | get -o 0.names)
  if $cached != null {
    return $cached
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  let names = (
    packCompleteListing $cmds
      | get stdout
      | lines
      | ansi strip
      | each { |l| do $keep $l }
      | compact
      | where { is-not-empty }
  )
  load-env {PACK_LISTED: (($env.PACK_LISTED? | default []) | append { key: $key, names: $names })}
  $names
}

# one name against a listing's names, the way every listing manager compares them
def packNamesHas [names: list<string>, name: string] {
  $names | any { |n| ($n | str lowercase) == ($name | str lowercase) }
}

def --env packListedHas [cmds: list<string>, name: string, keep: closure] {
  packNamesHas (packListedNames $cmds $keep) $name
}

# one entry per line, its name first and its detail — binaries, versions — indented under it or marked off
def packListedHead [line: string] {
  if ($line | str starts-with ' ') or ($line | str starts-with (char tab)) or ($line | str starts-with '-') {
    null
  } else {
    $line | split row ' ' | first | str trim --char ':'
  }
}

# npm-style listings name a package as name@version inside a drawn tree, and a scoped name carries its own leading
# '@', so the separator is the last one rather than the first
def packListedNodeName [line: string] {
  let token = ($line | split row ' ' | where { |t| ($t | str index-of --end '@') > 0 } | first 1 | get -o 0)
  if $token == null {
    null
  } else {
    $token | str substring 0..<($token | str index-of --end '@')
  }
}

# deno keeps a global install as a shim in its bin dir with the metadata beside it under a dot name, so the listing
# is a directory read rather than a command. the check states the path it read, since there is none to print
def --env packDenoInstalled [] {
  # windows has no HOME, so nu's own answer stands in; the env var still wins where it is set
  let dirPath = ([($env.HOME? | default $nu.home-dir) '.deno' bin] | path join)
  $env.PACK_PRINTED = '1'
  opPrintCmd 'ls' $dirPath
  if not ($dirPath | path exists) {
    return []
  }
  # the metadata directory beside each shim is dot-prefixed (`.yarn` for `yarn`), and nu's `ls` hides those
  # without `-a`: the listing answered empty on every machine, so nothing deno held was ever found
  ls -a $dirPath | where type == dir | get name | path basename | str substring 1..
}

# pnpm states what it holds twice otherwise: a drawn tree for `list`, and `--parseable` — one full path per line,
# `.../node_modules/<name>`, which is unambiguous where the tree's `name@version` tokens are not, and is the only
# form that spells a scoped name whole. the tree stays the dump; every check reads this
def --env packPnpmInstalled [] {
  packListedNames [pnpm list --global --parseable] { |line|
    let parts = ($line | path split)
    let at = ($parts | enumerate | where item == 'node_modules' | get -o 0.index)
    if $at == null { null } else { $parts | skip ($at + 1) | str join '/' }
  }
}

# go keeps each tool as one binary in its bin dir, and the binary carries the package and module it was built from:
# `go version -m` reads them back, so the listing is a directory read like deno's. its first line is the toolchain
# that built the binary
def packGoBinDir [] {
  let gobin = (^go env GOBIN | str trim)
  if ($gobin | is-not-empty) {
    $gobin
  } else {
    [(^go env GOPATH | str trim | split row (char esep) | first) bin] | path join
  }
}

def --env packGoTools [] {
  let dirPath = (packGoBinDir)
  $env.PACK_PRINTED = '1'
  opPrintCmd 'ls' $dirPath
  if not ($dirPath | path exists) {
    return []
  }
  ls $dirPath | where type == file | each { |f|
    let lines = (^go version -m $f.name | complete | get stdout | lines)
    let fields = ($lines | each { |l| $l | str trim | split row (char tab) })
    let path = ($fields | where { |r| ($r | first) == 'path' } | get -o 0.1)
    let mod = ($fields | where { |r| ($r | first) == 'mod' } | get -o 0 | default [])
    if $path == null {
      null
    } else {
      {
        bin: $f.name, path: $path, module: ($mod | get -o 1 | default $path), version: ($mod | get -o 2 | default ''),
        go: ($lines | get -o 0 | default '' | split row ': ' | last | str trim),
      }
    }
  } | compact
}

# a go tool answers to its package path, and to the name of its binary
def packGoNamed [tool: record, name: string] {
  packNamesHas [$tool.path ($tool.bin | path parse | get stem)] $name
}

def --env packInstalledGo [name: string] {
  packGoTools | any { |t| packGoNamed $t $name }
}

# the module proxy knows a module by its path, and a package path may be a module's root or somewhere under it, so the
# path and each parent are asked in turn. the proxy spells an upper case letter as ! and its lower case
def --env packExistsGo [name: string] {
  let parts = ($name | split row '@' | first | split row '/')
  let escape = { |p| $p | split chars | each { |c| if ($c =~ '[A-Z]') { $"!($c | str lowercase)" } else { $c } } | str join }
  seq ($parts | length) (-1) 1 | any { |n|
    packHttpOk $"https://proxy.golang.org/(do $escape ($parts | first $n | str join '/'))/@latest"
  }
}

def --env packInstalledDeno [name: string] {
  packNamesHas (packDenoInstalled) $name
}

# a manager's own installed listing, stated once. `list` dumps it and the plan reads it to answer before the gate;
# npm's own --parseable listing is pnpm's shape: the prefix's node_modules first, then a full path per package
def --env packNpmInstalled [] {
  packListedNames [npm ls --global --depth 0 --parseable] { |line|
    let parts = ($line | path split)
    let at = ($parts | enumerate | where item == 'node_modules' | get -o 0.index)
    if $at == null { null } else { $parts | skip ($at + 1) | str join '/' }
  }
}

# two statements of it is how `list` and `remove` came to disagree about the same name. deno has no such command —
# it keeps its global installs as shim directories — so it answers through packDenoInstalled instead
def packListCmd [manager: string] {
  match $manager {
    ghpm => [ghpm list],
    cargo => [cargo install --list],
    uv => [uv tool list],
    pnpm => [pnpm list --global],
    npm => [npm ls --global --depth 0],
    dotnet => [dotnet tool list --global],
    rv => [rv tool list],
    bun => [bun list --global],
    brew => [brew list],
    apk => [apk list --installed],
    apt => [apt list --installed],
    dnf => [dnf list --installed],
    emerge => [qlist --installed],
    yay => [yay --query],
    paru => [paru --query],
    pacman => [pacman --query],
    xbps => [xbps-query --list-pkgs],
    # not `search --installed-only`: it lists installed patterns too, beside packages of the same name
    # https://github.com/openSUSE/zypper/issues/498
    zypper => [zypper packages --installed-only],
    nix => [nix profile list],
    choco => [choco list],
    scoop => ((packScoopCmd) ++ [list]),
    winget => [winget list],
    _ => null,
  }
}

# `list`'s filter is find's rule over the manager's own output — a term starts a word of a line, as COMMANDS.md has
# it — so the check that answers before the gate is that same command and that same rule, and cannot drift from what
# gets dumped after
def --env packListedRaw [manager: string] {
  if $manager == 'deno' {
    return (packDenoInstalled)
  }
  if $manager == 'pnpm' {
    return (packPnpmInstalled)
  }
  if $manager == 'npm' {
    return (packNpmInstalled)
  }
  if $manager == 'dotnet' {
    return (packDotnetInstalled)
  }
  if $manager == 'rv' {
    return (packRvInstalled)
  }
  if $manager == 'go' {
    return (packGoTools | get path)
  }
  let cmds = (packListCmd $manager)
  if $cmds == null {
    return []
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  packCompleteListing $cmds | get stdout | lines | ansi strip
}

def packLinesLike [lines: list<string>, term: string] {
  $lines | any { |l| wutWordMatch $l $term }
}

# removing asks the opposite question of adding: not whether a manager could serve the name, but whether it is the
# one that actually has it here. every check is local, so the plan can run them before it asks rather than after.
# the answer is remembered for the run: a plan with five names asked uv five times for the same `uv tool list`,
# and the guards below ask again for names the plan already resolved
def --env packInstalled [manager: string, raw: string] {
  # paru, yay and pacman put the same question to the same query, so one answer serves the family
  let family = (if $manager in $PACK_PACMAN_FAMILY { 'pacman' } else { $manager })
  let key = $"($family)|($raw)"
  let cached = ($env.PACK_INSTALLED? | default [] | where key == $key | get -o 0.answer)
  if $cached != null {
    return $cached
  }
  let answer = (packInstalledCheck (packCopyBase $manager) $raw)
  load-env {PACK_INSTALLED: (($env.PACK_INSTALLED? | default []) | append { key: $key, answer: $answer })}
  $answer
}

def --env packInstalledCheck [manager: string, raw: string] {
  let parts = (packNameParts $raw)
  let name = $parts.name
  let flags = $parts.flags
  if ($name | is-empty) {
    return false
  }
  match $manager {
    # a standalone install is held when the file its installer puts down is there
    script => (packExpandPath $name | path exists),
    ghpm => (packListedHas [ghpm list --long-names] $name { |l| $l | str trim }),
    cargo => (packListedHas (packListCmd 'cargo') $name { |l| packListedHead $l }),
    uv => (packListedHas (packListCmd 'uv') $name { |l| packListedHead $l }),
    pnpm => (packNamesHas (packPnpmInstalled) $name),
    npm => (packNamesHas (packNpmInstalled) $name),
    dotnet => (packNamesHas (packDotnetInstalled) $name),
    rv => (packNamesHas (packRvInstalled) $name),
    bun => (packListedHas (packListCmd 'bun') $name { |l| packListedNodeName $l }),
    deno => (packInstalledDeno $name),
    go => (packInstalledGo $name),
    # `brew list --versions <name>` answers for formulae only, so a cask is invisible to it and remove could never
    # find one `list` had just shown. brew answers by listing, like the user managers above it, and the name's own
    # flags narrow that listing the same way they narrow the install: `--cask vivaldi` asks `brew list --cask`
    brew => (packListedHas ((packListCmd 'brew') ++ $flags) $name { |l| $l | str trim }),
    apk => (packOk [apk info -e $name]),
    # apt's own listing renames the package (zsh/stable,now), so the query that answers exactly is dpkg's
    apt => (packOk [dpkg-query --show $name]),
    dnf => (packOk [rpm --query $name]),
    emerge => (packOk [portageq has_version / $name]),
    nix => (packNixHas $name),
    yay => (packOk [pacman --query $name]),
    paru => (packOk [pacman --query $name]),
    pacman => (packOk [pacman --query $name]),
    xbps => (packOk [xbps-query $name]),
    zypper => (packOk [rpm --query $name]),
    choco => (packListedHas [choco list --exact --limit-output $name] $name { |l| $l | split row '|' | first }),
    scoop => (packOk ((packScoopCmd) ++ [prefix $name])),
    winget => (packOk [winget list --exact --id $name]),
    _ => false,
  }
}

# remove and a named sync both act on what is already here, so both answer with a local listing; add and find
# ask who could serve a name and pay a round trip for it
def packOpAsksInstalled [] {
  ($env.PACK_OP? | default '') in ['remove', 'sync']
}

# add asks who could serve a name, remove and sync ask who already has it; the walk over managers is the same either way
def --env packClaims [manager: string, name: string] {
  if (packOpAsksInstalled) {
    packInCopy $manager { packInstalled $manager $name }
  } else {
    packExists (packCopyBase $manager) $name
  }
}

def --env packRefresh [manager: string] {
  match $manager {
    ghpm => { packOp [ghpm refresh] },
    apk => { packOp [(packElevate 'apk') update] },
    apt => { packOp [(packElevate 'apt') update] },
    brew => { packOp [brew update] },
    dnf => { packOp [(packElevate 'dnf') makecache] },
    emerge => { packOp [(packElevate 'emerge') --sync] },
    yay => { packOp [yay --sync --refresh] },
    paru => { packOp [paru --sync --refresh] },
    pacman => { packOp [(packElevate 'pacman') --sync --refresh] },
    xbps => { packOp [$"(packElevate 'xbps')-install" --sync] },
    zypper => { packOp [(packElevate 'zypper') refresh] },
    scoop => { packOp ((packScoopCmd) ++ [update]) },
    winget => { packOp [winget source update] },
    _ => {},
  }
}

# a name may carry the flags its manager needs to disambiguate it: brew spells which flavor it means with `--cask`
# or `--formula`, for the occasional name packaged as both. the flags travel with the name they qualify rather than
# with the entry, so one group can hold `--cask vivaldi`, `--formula node` and a plain `jq` at once
def packNameParts [raw: string] {
  let parts = ($raw | split row ' ' | where { |p| $p | is-not-empty })
  {
    flags: ($parts | where { |p| $p | str starts-with '-' }),
    name: ($parts | where { |p| not ($p | str starts-with '-') } | str join ' '),
  }
}

# names carrying different flags cannot share an invocation — the flags are not distributive over the whole call —
# so they are grouped by flag set, in first-appearance order, and issued one call each
def packNameGroups [names: list<string>] {
  mut groups = []
  for raw in $names {
    let parts = (packNameParts $raw)
    if ($parts.name | is-empty) {
      continue
    }
    let key = ($parts.flags | str join ' ')
    let at = ($groups | enumerate | where { |g| $g.item.key == $key } | get -o 0.index)
    if $at == null {
      $groups = ($groups | append { key: $key, flags: $parts.flags, names: [$parts.name] })
    } else {
      $groups = ($groups | update $at { |g| $g | update names { |r| $r.names | append $parts.name } })
    }
  }
  $groups
}

# the env dump sets these as a flat string, and setOpNames may later replace them with a list
def packNameList [key: string] {
  let v = ($env | get -o $key)
  if $v == null {
    []
  } else if (($v | describe) | str starts-with 'list') {
    $v
  } else {
    [$v]
  }
}

# paru and yay are both aur helpers wrapping pacman, so either serves what the other or pacman declared, while
# pacman alone cannot serve an aur entry
def packPacmanBest [declared: string] {
  let usable = if $declared == 'pacman' { $PACK_PACMAN_FAMILY } else { ['paru', 'yay'] }
  $usable | where { |m| which $m | is-not-empty } | first 1 | get -o 0
}

# which manager actually serves a declared one on this machine, or null
def packManagerBest [manager: string] {
  if $manager == 'script' {
    # a script is gated by the server, so if it reached the plan this machine can run it
    'script'
  } else if $manager in $PACK_PACMAN_FAMILY {
    packPacmanBest $manager
  } else if $manager == 'npm' and (packNpmIsPnpms (which npm | get -o 0.path | default '' | path dirname)) {
    null
  } else if (which (packManagerBin $manager) | is-not-empty) and not (packManagerSplit $manager) {
    $manager
  } else {
    null
  }
}

# a manager and the toolchain it builds and runs on come from one install, or it does not install or sync: a cargo
# whose rustc is another install's, or a go ahead of gotm's on PATH, would act through one install and run on
# another. the ops that only read or take something out still reach it, since they are how a split is undone. each
# manager here is asked once a run, before anything is offered, and a split is said once, with what to look at
def --env packManagerCheck [] {
  if 'PACK_HELD' in $env or ($env.PACK_OP? | default '') not-in ['add' 'sync'] {
    return
  }
  let ids = (packManagersHere)
  mut held = {}
  for id in $ids {
    let base = (packCopyBase $id)
    mut h = (packInCopy $id { packManagerHeld $base })
    # a manager here more than once says which copy each row is, where its toolchain does not already
    if ($ids | where { |i| (packCopyBase $i) == $base } | length) > 1 and not ($h.note | str ends-with ')') {
      $h.note = ([$h.note $"\((packCopyAt $id))"] | where { is-not-empty } | str join ' ')
    }
    if ($h.split | is-not-empty) {
      opPrintWarn $"(packCopyLabel $id) skipped: ($h.split)"
      for d in $h.detail {
        opPrintWarn $"  ($d)"
      }
    }
    $held = ($held | upsert $id $h)
  }
  $env.PACK_HELD = $held
}

# the language managers can each be installed more than once — a distro's go beside gotm's, a winget .NET beside
# dotnetup's and scoop's, a pnpm 10 beside a pnpm 12 — and PATH holds whatever else put one there. the copies used are of
# the best kind of install there is, as add prefers the most portable manager: one in the home (packCopyTier) over a
# native manager's own tree, and either over the system's. each of those is a row, and the rest are left alone. the
# native managers are the system's, one each
const PACK_COPIED = ['pnpm' 'deno' 'bun' 'npm' 'uv' 'rv' 'dotnet' 'go' 'cargo']

# a row is a manager, or another copy of one: go@/opt/go/bin. the plain name is the first copy (packCopyDirs), which
# is the one a group's plan and a bare command mean
def packCopyBase [id: string] {
  $id | split row '@' | first
}

def packCopyDir [id: string] {
  if ($id | str contains '@') { $id | split row '@' | skip 1 | str join '@' } else { null }
}

# where a copy is: its own dir, or for the plain name, the first copy's
def packCopyAt [id: string] {
  packCopyDir $id | default (
    if $id in $PACK_COPIED { packCopyDirs $id | get -o 0 | default '' } else {
      which (packManagerBin $id) | get -o 0.path | default '' | path dirname
    }
  )
}

def packCopyLabel [id: string] {
  if (packCopyDir $id) == null { $id } else { $"(packCopyBase $id) \((packCopyDir $id))" }
}

# the trees a native manager keeps in, where an install is that manager's to move: scoop's (its global one too),
# homebrew's prefix, and the links winget makes for a user's install
def packNativeTrees [] {
  let home = ($env.HOME? | default $nu.home-dir)
  let local = ($env.LOCALAPPDATA? | default '')
  [
    ($env.SCOOP? | default ([$home scoop] | path join))
    ($env.SCOOP_GLOBAL? | default '')
    ($env.HOMEBREW_PREFIX? | default '')
    (if $nu.os-info.name == macos { '/opt/homebrew' } else { '/home/linuxbrew/.linuxbrew' })
    (if ($local | is-empty) { '' } else { [$local Microsoft WinGet] | path join })
  ] | where { is-not-empty }
}

# what kind of install a copy is, the way add orders its managers from the most portable: 0 for one in the home, as a
# toolchain's own manager or an installer puts it (dotnetup's, gotm's, rustup's, ghpm's, ~/.bun/bin), 1 for one a
# native manager keeps in its own tree, and 2 for the system's (/usr/bin, Program Files)
def packCopyTier [dir: string] {
  if (packNativeTrees | any { |t| packUnder $dir $t }) {
    1
  } else if (packUnder $dir ($env.HOME? | default $nu.home-dir)) {
    0
  } else {
    2
  }
}

# the dirs down PATH a manager is in, as `which --all` walks it, once each, and of those the best kind of install
# there is, in PATH order: a system dotnet is not a copy where dotnetup's or scoop's is here. npm's copy in pnpm's bin
# dir is pnpm's package, not a manager (see packNpmIsPnpms)
def packCopyDirs [manager: string] {
  let dirs = (
    which --all (packManagerBin $manager) | where type == external | get path | path dirname | uniq
      | where { |d| not ($manager == 'npm' and (packNpmIsPnpms $d)) }
      | each { |d| { dir: $d, tier: (packCopyTier $d) } }
  )
  if ($dirs | is-empty) {
    return []
  }
  let best = ($dirs | get tier | math min)
  $dirs | where tier == $best | get dir
}

# every copy of a manager, the first by its plain name
def packCopies [manager: string] {
  packCopyDirs $manager | enumerate | each { |d| if $d.index == 0 { $manager } else { $"($manager)@($d.item)" } }
}

# a copy runs with its own dir first on PATH, so everything it reaches for by name — rustc, gofmt, a cargo
# subcommand, a node — is its own install's rather than whichever PATH finds first, the plain name too: PATH may find
# a copy left alone ahead of it. the PATH it came in with stays readable, for the checks about what a package will
# run on once the run is done
def --env packCopyEnter [id: string] {
  let dir = if (packCopyBase $id) in $PACK_COPIED { packCopyAt $id | default '' } else { '' }
  let saved = { path: $env.PATH, copy: ($env.PACK_COPY? | default ''), shell: ($env.PACK_SHELL_PATH? | default null) }
  $env.PACK_COPY = $id
  $env.PACK_SHELL_PATH = ($saved.shell | default $saved.path)
  if ($dir | is-not-empty) {
    $env.PATH = ($env.PATH | prepend $dir)
  }
  $saved
}

def --env packCopyLeave [saved: record] {
  $env.PATH = $saved.path
  $env.PACK_COPY = $saved.copy
  if $saved.shell == null { hide-env PACK_SHELL_PATH } else { $env.PACK_SHELL_PATH = $saved.shell }
}

def --env packInCopy [id: string, body: closure] {
  let saved = (packCopyEnter $id)
  let out = (try { do --env $body } catch { |e|
    opRethrowInterrupt $e
    packCopyLeave $saved
    $e.raw
  })
  packCopyLeave $saved
  $out
}

# what a name resolves to on the PATH wut was run with, not the one a copy runs inside
def packShellWhich [name: string] {
  with-env { PATH: ($env.PACK_SHELL_PATH? | default $env.PATH) } { which $name | get -o 0.path }
}

# what a manager runs on — the toolchain its sync moves, for its row — and, when it is split, why, with the paths or
# the fix that say more
def --env packManagerHeld [manager: string] {
  match $manager {
    bun => (packBunHeld), cargo => (packCargoHeld), deno => (packDenoHeld), dotnet => (packDotnetHeld),
    go => (packGoHeld), npm => (packNpmHeld), pnpm => (packPnpmHeld), rv => (packRvHeld), uv => (packUvHeld),
    _ => (packHeld),
  }
}

def packHeld [note: string = '', split: string = '', detail: list<string> = []] {
  { note: $note, split: $split, detail: $detail }
}

# whether a path is inside a dir, by where each really is
def packUnder [path: string, dir: string] {
  ($path | is-not-empty) and (($path | path expand) | str starts-with (($dir | path expand) + (char path_sep)))
}

def packManagerSplit [manager: string] {
  $env.PACK_HELD? | default {} | get -o $manager | get -o split | default '' | is-not-empty
}

def packManagerNote [manager: string] {
  $env.PACK_HELD? | default {} | get -o $manager | get -o note | default ''
}

# the first version a toolchain's --version prints, or empty: rustc 1.99.1 (...), v26.12.0, deno 2.5.0 (...)
def packVersionOf [text: string] {
  $text | parse --regex '(?<v>\d+\.\d+(?:\.\d+)?)' | get -o 0.v | default ''
}

# a check of what a manager runs on, shown as every check is, its answer kept rather than printed. --home asks from
# the home dir: rustc and go both answer for the toolchain a project file above the cwd asks for, and the row is
# about the machine's
def --env packAsk [cmds: list<string>, --home] {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  let dir = if $home { $env.HOME? | default $nu.home-dir } else { $env.PWD }
  do { cd $dir; packComplete $cmds }
}

# the command a manager is found by, where it is not the manager's own name: xbps is a set of xbps-* commands
def packManagerBin [manager: string] {
  match $manager {
    xbps => 'xbps-install',
    _ => $manager,
  }
}

def packManagerHere [manager: string] {
  (packManagerBest $manager) != null
}

# the pacman family collapses to one entry, so it is never offered or run three times over
# and each language manager is every valid copy of it here
def --env packManagersHere [] {
  mut ids = []
  for m in ($env.PACK_MANAGERS? | default []) {
    if $m in $PACK_COPIED {
      $ids = ($ids ++ (packCopiesApart (packCopies $m | where { |id| not (packManagerSplit $id) })))
    } else {
      $ids = ($ids ++ ([(packManagerBest $m)] | compact))
    }
  }
  $ids | uniq
}

# where a copy keeps the packages it installs. most copies of a manager share one — every cargo installs into
# ~/.cargo, every dotnet's tools are in ~/.dotnet/tools — while a pnpm or an npm keeps its own per version or prefix.
# null where it is not known, which keeps the copy apart
def --env packManagerHome [manager: string] {
  let home = ($env.HOME? | default $nu.home-dir)
  let asked = { |cmds| let r = (packComplete $cmds); if $r.exit_code == 0 { $r.stdout | str trim } else { '' } }
  let dir = match $manager {
    bun => (packBunRoot),
    cargo => ($env.CARGO_INSTALL_ROOT? | default ($env.CARGO_HOME? | default ([$home .cargo] | path join))),
    deno => ($env.DENO_INSTALL_ROOT? | default ([$home .deno] | path join)),
    dotnet => (packDotnetToolsDir),
    go => (try { packGoBinDir } catch { |e| opRethrowInterrupt $e; '' }),
    npm => (do $asked [npm prefix --global]),
    pnpm => (do $asked [pnpm root --global]),
    rv => (do $asked [rv tool dir]),
    uv => (do $asked [uv tool dir]),
    _ => '',
  }
  if ($dir | is-empty) { null } else { $dir | path expand }
}

# sync moves each copy's own toolchain, and add builds with the copy picked, so both reach every copy, one at a time:
# each does only what its own toolchain calls for. the rest only read or remove packages, and a copy whose packages an
# earlier copy already holds would list each of them again, and remove each twice: it is left out of those
def --env packCopiesApart [ids: list<string>] {
  if ($ids | length) < 2 or ($env.PACK_OP? | default '') in ['add' 'sync'] {
    return $ids
  }
  mut seen = []
  mut kept = []
  for id in $ids {
    let cached = ($env.PACK_HOMES? | default [] | where id == $id)
    let dir = if ($cached | is-not-empty) {
      $cached | first | get dir
    } else {
      let d = (packInCopy $id { packManagerHome (packCopyBase $id) })
      load-env {PACK_HOMES: (($env.PACK_HOMES? | default []) | append { id: $id, dir: $d })}
      $d
    }
    if $dir == null or $dir not-in $seen {
      $kept = ($kept | append $id)
    }
    if $dir != null {
      $seen = ($seen | append $dir)
    }
  }
  $kept
}

def --env packRefreshAll [] {
  for m in (packManagersHere | each { |id| packCopyBase $id } | uniq) { packRefresh $m }
}

def --env packFindFirstIn [managers: list<string>, name: string] {
  for m in $managers {
    if (packClaims $m $name) { return $m }
  }
  null
}

# every manager of these that has it, in the order given. a `where` would read better and remember nothing: what a
# check learns inside a closure does not leave it
def --env packClaimsAll [managers: list<string>, name: string] {
  mut every = []
  for m in $managers {
    if (packClaims $m $name) {
      $every = ($every | append $m)
    }
  }
  $every
}

# add's search asks every manager rather than stopping at the first that has a name, since the first in wut's order is
# not always the one wanted: ghpm has a github repo's release binary, go builds the same tool from source. a name only
# one manager has goes there; when any has several, every name under every manager that has it is a row of a second
# pick, and each name goes to the first picked row for it. -y picks every row, which is wut's order again
def --env packSearchPick [names: list<string>] {
  let here = (packManagersHere)
  mut claims = {}
  for name in $names {
    let every = (packClaimsAll $here $name)
    if ($every | is-empty) {
      load-env {PACK_UNSERVED: (($env.PACK_UNSERVED? | default []) | append $name)}
    } else {
      $claims = ($claims | upsert $name $every)
    }
  }
  if ($claims | is-empty) {
    return {}
  }
  let claims = $claims
  let ask = ($claims | values | any { |every| ($every | length) > 1 })
  # a row is one name under one manager that has it, in wut's order, so each name is decided on its own
  let rows = ($here | each { |m|
    $claims | transpose name every | where { |c| $m in $c.every } | each { |c| { manager: $m, package: $c.name } }
  } | flatten)
  let chosen = if not $ask {
    $rows
  } else {
    opPrint ''
    opPrint '?'
    wutTable ['manager' 'package'] ($rows | enumerate | each { |r| [$"($r.index + 1)\) ($r.item.manager)", $r.item.package] })
    let picked = (wutSelectRead ($rows | length))
    if $picked == null { [] } else { $picked | each { |i| $rows | get ($i - 1) } }
  }
  # a name picked under two managers goes to the first, which is wut's order again
  mut found = {}
  for r in ($chosen | uniq-by package) {
    $found = ($found | upsert $r.manager (($found | get -o $r.manager | default []) | append $r.package))
  }
  $found
}

def --env packRunLoose [manager: string] {
  let key = $"PACK_($env.PACK_OP | str uppercase)_NAMES"
  # stated, not implied: the manager function guards on it, and sync's own guard asks it what it holds
  load-env {($key): $env.PACK_LOOSE_NAMES, PACK_MANAGER: $manager}
  packCallManager $manager
  hide-env PACK_MANAGER
}

# a copy's manager runs inside that copy, and is the manager it is a copy of to everything that asks
def --env packCallManager [id: string] {
  let manager = (packCopyBase $id)
  let asked = ($env.PACK_MANAGER? | default null)
  if $asked != null {
    $env.PACK_MANAGER = $manager
  }
  let saved = (packCopyEnter $id)
  try { packCallBase $manager } catch { |e|
    opRethrowInterrupt $e
    packCopyLeave $saved
    $e.raw
  }
  packCopyLeave $saved
  if $asked != null {
    $env.PACK_MANAGER = $asked
  }
}

def --env packCallBase [manager: string] {
  match $manager {
    ghpm => { packGhpm }, cargo => { packCargo }, uv => { packUv }, pnpm => { packPnpm }, npm => { packNpm },
    dotnet => { packDotnet }, rv => { packRv },
    bun => { packBun }, deno => { packDeno }, go => { packGo }, brew => { packBrew }, apk => { packApk },
    apt => { packApt }, dnf => { packDnf }, emerge => { packEmerge }, yay => { packPacman }, paru => { packPacman },
    pacman => { packPacman }, xbps => { packXbps }, zypper => { packZypper }, nix => { packNix },
    choco => { packChoco }, scoop => { packScoop }, winget => { packWinget }, _ => {},
  }
}



def packFindWinner [candidates: list] {
  for c in $candidates {
    let m = (packManagerBest $c.manager)
    if $m != null { return { manager: $m, pkg: $c.pkg } }
  }
  null
}

def --env packFindShow [] {
  let parsed = ($env.PACK_FIND? | default '{"groups":{},"remaining":[]}' | from json)
  let groups = (
    $parsed.groups | transpose label candidates
      | each { |g| { label: $g.label, winner: (packFindWinner $g.candidates) } }
      | where { |g| $g.winner != null }
  )
  if ($groups | is-empty) {
    return
  }
  for m in ($groups | group-by { |g| $g.winner.manager } | transpose manager entries) {
    opPrint $m.manager
    for g in $m.entries {
      opPrint $"  ($g.label)"
      opPrint $"    ($g.winner.pkg)"
    }
  }
}

# a name no group claimed is only resolvable by asking managers, so that search is the one thing find gates
def --env packFindSearch [] {
  let parsed = ($env.PACK_FIND? | default '{"groups":{},"remaining":[]}' | from json)
  let remaining = ($parsed.remaining? | default [])
  if ($remaining | is-empty) {
    return
  }
  let here = (packManagersHere)
  if ($here | is-empty) {
    opPrintWarn $"no manager installed to search for: ($remaining | str join ', ')"
    return
  }

  opPrint '?'
  opPrint $"  ($remaining | str join ', ')"
  opPrint ''
  wutTable ['manager'] ($here | enumerate | each { |m| [$"($m.index + 1)\) ($m.item)"] })
  let picked = (wutSelectRead ($here | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $here | get ($i - 1) })
  $env.PACK_AGREED = '1'

  mut byManager = {}
  mut missing = []
  for name in $remaining {
    let every = (packClaimsAll $chosen $name)
    if ($every | is-empty) {
      $missing = ($missing | append $name)
    }
    for m in $every {
      $byManager = ($byManager | upsert $m (($byManager | get -o $m | default []) | append $name))
    }
  }
  opPrint ''
  for m in ($byManager | columns) {
    opPrint $m
    opPrint $"  (($byManager | get $m) | str join ', ')"
  }
  if ($missing | is-not-empty) {
    opPrint '?'
    opPrint $"  ($missing | str join ', ')"
  }
}

# the first path whose manager is on this machine wins the group, in the order the group stated. the installed ops
# narrow that: a manager that never installed the group is not the one to act on it, however present it is.
# remove and sync both take every manager actually holding the group, each a row of the table, so which of them runs
# is the pick rather than whichever the group stated first
def --env packPickPaths [unit: record, provided: record = {}] {
  if not (packOpAsksInstalled) {
    # add can also take a manager another group in this run puts down: that group is the one it waits for
    let usable = ($unit.paths | where { |p| (packManagerHere $p.manager) or (packProviderOf $provided $p.manager $unit.group) != null })
    return ($usable | first 1)
  }
  let here = ($unit.paths | where { |p| packManagerHere $p.manager })
  mut held = []
  for p in $here {
    let m = (packManagerBest $p.manager)
    mut has = false
    for n in $p.names {
      if (packInstalled $m $n) {
        $has = true
      }
    }
    if $has {
      $held = ($held | append $p)
    }
  }
  $held
}

# which group in the plan puts a manager down, other than the one asking: a group never waits for itself
def packProviderOf [provided: record, manager: string, group: string] {
  $provided | get -o $manager | default [] | where { |g| $g != $group } | get -o 0
}

# the managers groups in this run put down, and which groups put them down. a group counts only if it can run here
# itself, now or after another group it waits for, so the answer grows until it stops changing
def --env packProvided [units: list] {
  mut provided = {}
  loop {
    let known = $provided
    let next = ($units | where { |u|
      ($u.provides? | default [] | is-not-empty) and ($u.paths | any { |p|
        (packManagerHere $p.manager) or (packProviderOf $known $p.manager $u.group) != null
      })
    } | each { |u| $u.provides | each { |m| { manager: $m, group: $u.group } } } | flatten)
    let grown = ($next | group-by manager | transpose manager rows | reduce --fold {} { |e, acc|
      $acc | upsert $e.manager ($e.rows | get group | uniq)
    })
    if ($grown | to json) == ($known | to json) {
      break
    }
    $provided = $grown
  }
  $provided
}

# a group's stage is one past the group it waits for, and a group that waits for nothing is stage 0. any group whose
# manager another group in the plan puts down waits for it, here or not: pnpm's own setup is what put node down, so
# a pnpm install runs after it either way
def packStaged [details: list] {
  mut staged = ($details | each { |d| $d | insert stage 0 })
  for _ in ($details | enumerate) {
    let known = $staged
    $staged = ($known | each { |d|
      let after = ($known | where group == $d.after | get -o 0.stage)
      $d | update stage (if $after == null { 0 } else { $after + 1 })
    })
  }
  $staged
}

# the arm a picked group runs. one that waited is checked again first, since the group it waited for may have put
# down something else, or failed: the next manager the yaml lists that is here now runs instead, and it says so
def --env packStageId [d: record] {
  if not $d.waits or (packManagerHere $d.manager) {
    return $d.id
  }
  let alt = ($d.alts | where { |a| packManagerHere $a.manager } | get -o 0)
  if $alt == null {
    opPrintWarn $"($d.group) skipped: ($d.manager) is not here"
    return null
  }
  opPrintWarn $"($d.group): ($d.manager) is not here, using ($alt.manager)"
  $alt.id
}

def --env packPlanRun [] {
  packManagerCheck
  let units = ($env.PACK_PLAN? | default '[]' | from json)

  # a group whose every path needs a manager this machine lacks is not a plan, it is an absence: drop it, and let
  # the name it came from fall through to a find like any other unclaimed name
  let provided = (packProvided $units)
  mut detail = []
  mut served = []
  for unit in $units {
    let paths = (packPickPaths $unit $provided)
    if ($paths | is-not-empty) {
      $served = ($served | append $unit.name)
      for path in $paths {
        let here = (packManagerHere $path.manager)
        # the paths after the winner, in the yaml's order: what add falls back to when the manager it waits for
        # never turns up
        let alts = ($unit.paths | skip until { |p| $p.id == $path.id } | skip 1 | each { |p| { id: $p.id, manager: $p.manager } })
        $detail = ($detail | append {
          manager: (if $here { packManagerBest $path.manager } else { $path.manager }), group: $unit.group, id: $path.id,
          names: $path.names, pre: ($unit.pre? | default []), post: ($unit.post? | default []),
          after: (packProviderOf $provided $path.manager $unit.group), waits: (not $here), alts: $alts,
        })
      }
    }
  }
  let planned = (packStaged $detail)

  let fellThrough = ($units | each { |u| $u.name } | uniq | where { |n| $n not-in $served })
  let loose = ((packNameList 'PACK_ADD_NAMES') ++ (packNameList 'PACK_REMOVE_NAMES') ++ (packNameList 'PACK_SYNC_NAMES') ++ $fellThrough | uniq)

  # remove and sync ask their managers a local question — what is installed — so the answer is affordable before the
  # gate and belongs in the table, named. add asks the registries, a round trip per manager per name, so those names
  # wait behind '?' and are only searched once something has been picked
  mut resolved = {}
  mut unresolved = []
  if (packOpAsksInstalled) and ($loose | is-not-empty) {
    let here = (packManagersHere)
    for name in $loose {
      # every manager holding it is a row: the table is where one is picked, so a name two managers both hold is not
      # settled for you by whichever sorts first
      let winners = (packClaimsAll $here $name)
      if ($winners | is-empty) {
        $unresolved = ($unresolved | append $name)
      } else {
        for winner in $winners {
          $resolved = ($resolved | upsert $winner (($resolved | get -o $winner | default []) | append $name))
        }
      }
    }
  }
  let looseFor = $resolved
  let deferred = if (packOpAsksInstalled) { [] } else { $loose }
  if ($unresolved | is-not-empty) {
    load-env {PACK_UNSERVED: (($env.PACK_UNSERVED? | default []) | append $unresolved)}
  }

  let planManagers = (($planned | each { |d| $d.manager }) ++ ($looseFor | columns) | uniq)
  if ($planManagers | is-empty) and ($deferred | is-empty) {
    packReport
    if ($unresolved | is-empty) {
      opPrintWarn 'nothing to do'
    }
    return
  }

  if 'PACK_PRINTED' in $env {
    opPrint ''
  }
  for m in $planManagers {
    opPrint $m
    for d in ($planned | where manager == $m) {
      opPrint $"  ($d.group)"
      opPrint $"    ($d.names | str join ', ')"
      if ($d.pre | is-not-empty) {
        opPrint $"    first: ($d.pre | each { |s| $s.id } | str join ', ')"
      }
      if $d.waits {
        opPrint $"    after: ($d.after)"
      }
      if ($d.post | is-not-empty) {
        opPrint $"    then: ($d.post | each { |s| $s.id } | str join ', ')"
      }
    }
    let own = ($looseFor | get -o $m | default [])
    if ($own | is-not-empty) {
      opPrint $"  ($own | str join ', ')"
    }
  }

  # every row is one thing to pick, and the summary above is where a row's contents are listed: a group under the
  # manager serving it, so a folder that brought several groups along is still picked a group at a time, then each
  # loose name a manager won. '?' rows are the names no group claimed and nothing has resolved yet: only add leaves
  # any, and only until the gate, so picking one is picking the search for it
  mut rows = []
  for m in $planManagers {
    for g in ($planned | where manager == $m | get group | uniq) {
      $rows = ($rows | append { manager: $m, group: $g, package: null })
    }
    for n in ($looseFor | get -o $m | default []) {
      $rows = ($rows | append { manager: $m, group: null, package: $n })
    }
  }
  for n in $deferred {
    $rows = ($rows | append { manager: '?', group: null, package: $n })
  }
  let choices = $rows
  opPrint ''
  wutTable ['manager' 'group' 'package'] ($choices | enumerate | each { |c|
    [$"($c.index + 1)\) ($c.item.manager)", ($c.item.group | default ''), ($c.item.package | default '')]
  })
  let picked = (wutSelectRead ($choices | length))
  if $picked == null {
    return
  }
  let chosenRows = ($picked | each { |i| $choices | get ($i - 1) })
  let chosenLoose = ($chosenRows | where package != null)

  # agreed once, up front: nothing below asks again
  $env.PACK_AGREED = '1'
  # the pick is the yes: a script install, or a group's pre or post script, asks nothing further once picked
  $env.YES = '1'
  let picked = ($planned | where { |d| $chosenRows | any { |r| $r.manager == $d.manager and $r.group == $d.group } })
  # a group's pre scripts all run before any install or removal, while what they act on is still there
  packRunScripts 'pre' ($picked | each { |d| $d.pre } | flatten | uniq-by id)

  # the loose names remove already resolved ride with the manager row that won them; the ones add left behind ride
  # with '?', and are searched only now, against every manager, since picking '?' is picking the search itself
  mut running = ($chosenLoose | where manager != '?' | group-by manager | transpose manager rows | each { |e|
    { manager: $e.manager, names: ($e.rows | get package) }
  })
  let searched = ($chosenLoose | where manager == '?' | get package)
  if ($searched | is-not-empty) {
    packRefreshAll
    $running = ($running ++ (packSearchPick $searched | transpose manager names))
  }
  let looseRuns = $running

  # a stage at a time: a group that puts a manager down, then its post scripts — which are what put the language
  # itself down — then the groups that manager serves. removing walks the stages the other way, so a tool goes while
  # the manager that installed it is still there to take it out
  let stages = ($picked | get stage | uniq | sort)
  let order = if $env.PACK_OP == 'remove' { $stages | reverse } else { $stages }
  mut ranPosts = []
  mut first = true
  for stage in $order {
    if not $first {
      wutPathRefresh
    }
    mut posts = []
    for d in ($picked | where stage == $stage) {
      let id = (packStageId $d)
      if $id == null {
        continue
      }
      let failedBefore = ($env.PACK_FAILED? | default [] | length)
      try {
        packRunUnit $id
      } catch { |e|
        packMarkFailed $id $e
      }
      # a group whose install or removal failed has nothing to follow it
      if ($env.PACK_FAILED? | default [] | length) == $failedBefore {
        $posts = ($posts | append $d.post)
      }
    }
    if $first {
      for entry in $looseRuns {
        load-env {PACK_LOOSE_NAMES: $entry.names}
        try {
          packRunLoose $entry.manager
        } catch { |e|
          packMarkFailed ($entry.names | str join ', ') $e
        }
      }
    }
    $first = false
    let ran = $ranPosts
    let due = ($posts | uniq-by id | where { |p| $p.id not-in $ran })
    # the installs put their commands where the env stage says they go, which the post scripts are about to look for
    if ($due | is-not-empty) {
      wutPathRefresh
      packRunScripts 'post' $due
      $ranPosts = ($ranPosts ++ ($due | get id))
    }
  }
  if ($looseRuns | is-not-empty) and ($picked | is-empty) {
    for entry in $looseRuns {
      load-env {PACK_LOOSE_NAMES: $entry.names}
      try {
        packRunLoose $entry.manager
      } catch { |e|
        packMarkFailed ($entry.names | str join ', ') $e
      }
    }
  }
  packReport
}

# post scripts run after the installs or removals of their stage, so one can lean on a tool another group just
# installed, and pre scripts before any of them. either one's has_cmd is asked only when it is about to run, against
# the PATH refreshed after the installs: the install is what put the command there
def --env packRunScripts [stage: string, scripts: list] {
  for s in $scripts {
    if ($s.cmds | is-not-empty) and not ($s.cmds | any { |c| which $c | is-not-empty }) {
      opPrintWarn $"($s.id) skipped: ($s.cmds | str join ' or ') not found"
      continue
    }
    opPrintInfo $s.id
    try {
      packRunUnit $s.id
    } catch { |e|
      packMarkFailed $s.id $e
    }
  }
}

# the read ops with a term have a local answer worth having first: which managers have something matching is the
# same listing `list` was going to dump, and a package has to be installed before it can be out of date, so both
# run it before the gate and the table names the managers rather than offering all of them. bare, neither has
# anything cheaper than running the managers, so the only question left is which ones
def --env packTermPlanRun [names_key: string] {
  packManagerCheck
  let names = (packNameList $names_key)
  if ($names | is-empty) {
    packManagerPlanRun
    return
  }
  let here = (packManagersHere)
  if ($here | is-empty) {
    opPrintWarn 'no manager installed'
    return
  }

  # what a manager matched is kept twice: the terms, which its op is handed after the gate, and the lines of its
  # listing they matched, which are what the summary shows. a term starts a word rather than being a name, so the
  # term itself is not something the manager has: `go` under ghpm is gotm, and under winget it is goose game
  mut hits = {}
  mut entries = {}
  for m in $here {
    let lines = (packInCopy $m { packListedRaw (packCopyBase $m) })
    let matched = ($names | where { |n| packLinesLike $lines $n })
    if ($matched | is-not-empty) {
      $hits = ($hits | upsert $m $matched)
      let shown = ($lines | where { |l| $matched | any { |n| wutWordMatch $l $n } } | each { |l|
        $l | str trim | str replace --all --regex '\s+' ' '
      })
      $entries = ($entries | upsert $m $shown)
    }
  }
  let found = $hits
  let shown = $entries
  let managers = ($found | columns)
  let missing = ($names | where { |n| not ($managers | any { |m| $n in ($found | get $m) }) })

  if ($managers | is-empty) {
    opPrintWarn $"no manager has installed: ($names | str join ', ')"
    return
  }

  if 'PACK_PRINTED' in $env {
    opPrint ''
  }
  for m in $managers {
    opPrint $m
    for e in ($shown | get $m) {
      opPrint $"  ($e)"
    }
  }
  if ($missing | is-not-empty) {
    opPrintWarn $"no manager has installed: ($missing | str join ', ')"
  }

  opPrint ''
  wutTable ['manager'] ($managers | enumerate | each { |m| [$"($m.index + 1)\) ($m.item)"] })
  let picked = (wutSelectRead ($managers | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $managers | get ($i - 1) })

  $env.PACK_AGREED = '1'
  for m in $chosen {
    # only the terms this manager actually matched, so its output has nothing in it that came back empty
    load-env {($names_key): ($found | get $m)}
    try {
      packCallManager $m
    } catch { |e|
      packMarkFailed $m $e
    }
  }
  packReport
}

# sync, tidy, outdated and info know nothing until a manager runs, so there is no detail to show first:
# the only question is which managers this run touches
# a standalone install's path as a group states it: {HOME} and any other env name, with windows' missing HOME
# answered the way nu answers it
def packExpandPath [path: string] {
  mut out = ($path | str replace --all '{HOME}' ($env.HOME? | default $nu.home-dir))
  if ($out | str contains '{') {
    for e in ($env | items { |k, v| [$k, $v] } | where { |e| ($e.1 | describe) == 'string' }) {
      $out = ($out | str replace --all $"{($e.0)}" $e.1)
    }
  }
  # the yaml writes one path for every platform's eyes; windows prints and runs its own separator
  if $nu.os-info.name == 'windows' {
    $out = ($out | str replace --all '/' '\')
  }
  $out
}

# a tool that updates itself is asked to by the path its own installer put it at — never by whatever its name
# resolves to, which can be another manager's copy. it is best effort: a self update that is built out, turned off
# or refused is how a copy something else owns answers, so it is said and the run goes on
def --env packSelfUpdate [what: string, path: string, args: list<string>] {
  let bin = (packExpandPath $path)
  if not ($bin | path exists) {
    return
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd $bin ...$args
  if 'NOOP' in $env {
    return
  }
  let updated = (try { run-external $bin ...$args; true } catch { |e| opRethrowInterrupt $e; false })
  if not $updated {
    opPrintWarn $"($what) did not update itself: its self update may be off, or it refused"
  }
}

# the standalone installs a bare sync can find here: a group states where its own installer puts the tool, and a
# file at that path is the whole check
def packSelfHere [] {
  ($env.PACK_SELF? | default '[]' | from json) | where { |s| packExpandPath $s.path | path exists }
}

# the manager a standalone install is, when it is one: the binary is named for what it runs as
def packSelfManager [path: string] {
  packExpandPath $path | path parse | get stem
}

# the row a standalone install's self update runs in: the copy of that manager at its path, else its first copy
def packSelfRow [s: record, rows: list<string>] {
  let copies = ($rows | where { |id| (packCopyBase $id) == (packSelfManager $s.path) })
  let dir = (packExpandPath $s.path | path dirname)
  $copies | where { |id| (packCopyAt $id | path expand) == ($dir | path expand) } | get -o 0 | default ($copies | get -o 0)
}

def --env packManagerPlanRun [] {
  packManagerCheck
  let managers = (packManagersHere)
  let selfHere = if ($env.PACK_OP? | default '') == 'sync' { packSelfHere } else { [] }
  # a manager's self update runs in its own row; the rest in the script row
  let selfManaged = ($selfHere | where { |s| packSelfRow $s $managers | is-not-empty })
  let selfRest = ($selfHere | where { |s| $s not-in $selfManaged })
  let here = if ($selfRest | is-empty) { $managers } else { $managers | append 'script' }
  if ($here | is-empty) {
    opPrintWarn 'no manager installed'
    return
  }

  if 'PACK_PRINTED' in $env {
    opPrint ''
  }
  mut chosen = $here
  if 'PACK_AGREED' not-in $env {
    # each row names what it runs on, which is also what its sync moves: go 1.27.3 (gotm), rust 1.99.1 (rustup)
    wutTable ['manager' 'toolchain'] ($here | enumerate | each { |m|
      [$"($m.index + 1)\) (packCopyBase $m.item)", (packManagerNote $m.item)]
    })
    let picked = (wutSelectRead ($here | length))
    if $picked == null {
      return
    }
    $chosen = ($picked | each { |i| $here | get ($i - 1) })
  }

  $env.PACK_AGREED = '1'
  for m in $chosen {
    if $m == 'script' {
      for s in $selfRest {
        packSelfUpdate $s.group $s.path $s.args
      }
      continue
    }
    for s in ($selfManaged | where { |s| (packSelfRow $s $managers) == $m }) {
      packSelfUpdate $s.group $s.path $s.args
    }
    # stated, so an op that keeps per-manager detail — info's declared names — knows who is asking
    load-env {PACK_MANAGER: $m}
    try {
      packCallManager $m
    } catch { |e|
      packMarkFailed $m $e
    }
    hide-env PACK_MANAGER
  }
  packReport
}

# a manager runs when it is here, when the plan named it or named none, and when there is anything left to do.
# a few probe under a different name than they are declared by: xbps is reached through `xbps-install`
def packSkip [declared: string, probe?: string] {
  # the outer parens are load-bearing: a bare multi-line expression ends at the first newline
  (
    (which ($probe | default $declared) | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $declared) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  )
}

# which ops want a manager's index refreshed first. ghpm states its own, narrower rule
def --env packRefreshForOp [manager: string] {
  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] {
    packRefresh $manager
  }
}

def packNothingToDo [] {
  match $env.PACK_OP {
    add => ((packNameList 'PACK_ADD_NAMES') | is-empty),
    remove => ((packNameList 'PACK_REMOVE_NAMES') | is-empty),
    _ => false,
  }
}

# by the time a manager runs, the plan has chosen it and the user has already agreed
# nothing is checked or asked here: the plan already resolved who serves each name — packExists for add,
# packInstalled for remove — and got its one answer before any manager was called
def --env packMutate [names_key: string, cmds: list<string>, each: bool] {
  let names = (packNameList $names_key)
  if ($names | is-empty) {
    return
  }
  for g in (packNameGroups $names) {
    if $each {
      for n in $g.names { packOpStrict ($cmds ++ $g.flags ++ [$n]) }
    } else {
      packOpStrict ($cmds ++ $g.flags ++ $g.names)
    }
  }
  load-env {($names_key): []}
}

def --env packMarkFailed [what: string, e: record] {
  opRethrowInterrupt $e
  load-env {PACK_FAILED: (($env.PACK_FAILED? | default []) | append $"($what): ($e.msg | lines | first)")}
}

# only the exceptions: a clean run says nothing
def packReport [] {
  let unserved = ($env.PACK_UNSERVED? | default [])
  let failed = ($env.PACK_FAILED? | default [])
  if ($unserved | is-not-empty) {
    if (packOpAsksInstalled) {
      opPrintWarn $"no manager has installed: ($unserved | str join ', ')"
    } else {
      opPrintWarn $"no manager had: ($unserved | str join ', ')"
    }
  }
  if ($failed | is-not-empty) {
    opPrintErr 'failed:'
    for f in $failed { opPrintErr $"  ($f)" }
  }
  if ($failed | is-not-empty) {
    exit 1
  }
}

# no try wrapper: an install that fails has to reach the caller so the run can report it
def --env packOpStrict [cmds: list<string>] {
  $env.PACK_PRINTED = '1'
  opPrintMaybeRunCmd ...$cmds
}

def --env packOp [cmds: list<string>] {
  $env.PACK_PRINTED = '1'
  opPrintCmd try '{' ...$cmds '}'
  opMaybeRunCmd try '{' ...$cmds '}' $PACK_TRY_CATCH
}

def --env packOpAdd [cmds: list<string>, --each] {
  packMutate PACK_ADD_NAMES $cmds $each
}

# what to ask this manager about: the names the groups declared for it, plus whatever no group claimed, asked as
# typed. a group that names no entry for this manager contributes nothing, so it is not asked about at all
def --env packInfoNames [] {
  let map = ($env.PACK_INFO_MAP? | default '{}' | from json)
  let manager = ($env.PACK_MANAGER? | default '')
  let keys = (if $manager in $PACK_PACMAN_FAMILY { $PACK_PACMAN_FAMILY } else { [$manager] })
  mut declared = []
  for k in $keys {
    $declared = ($declared ++ ($map | get -o $k | default []))
  }
  ($declared | uniq) ++ (packNameList 'PACK_INFO_NAMES')
}

def --env packOpInfo [cmds: list<string>] {
  for term in (packInfoNames) {
    packDo ($cmds ++ [$term])
  }
}

def --env packOpList [cmds: list<string>] {
  packFiltered $cmds (packNameList 'PACK_LIST_NAMES')
}

def --env packOpOutdated [cmds: list<string>] {
  packFiltered $cmds (packNameList 'PACK_OUTDATED_NAMES')
}

def --env packOpRemove [cmds: list<string>, --each] {
  packMutate PACK_REMOVE_NAMES $cmds $each
}

# sync updates what is already here; it never installs. several of these commands cannot tell the difference —
# `deno install --force`, `pacman --sync --needed` and `choco upgrade` install a name they do not find — so the
# names are narrowed to the ones this manager holds rather than trusted to the command. the plan asked the same
# question to pick the manager, and packInstalled remembers its answers, so this costs nothing and prints nothing
def --env packSyncNames [] {
  let names = (packNameList 'PACK_SYNC_NAMES')
  let manager = ($env.PACK_MANAGER? | default '')
  if ($names | is-empty) or ($manager | is-empty) {
    return $names
  }
  mut held = []
  for n in $names {
    if (packInstalled $manager $n) {
      $held = ($held | append $n)
    }
  }
  $held
}

def --env packOpSync [cmdsNoArgs: list<string>, cmds: list<string>, --each] {
  # no names at all is the whole-manager upgrade; names that this manager turns out not to hold are not
  let asked = (packNameList 'PACK_SYNC_NAMES')
  if ($asked | is-empty) {
    packOp $cmdsNoArgs
    return
  }
  for g in (packNameGroups (packSyncNames)) {
    if $each {
      for n in $g.names {
        packOp ($cmds ++ $g.flags ++ [$n])
      }
    } else {
      packOp ($cmds ++ $g.flags ++ $g.names)
    }
  }
}

