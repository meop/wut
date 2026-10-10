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
    packDo ($cmds ++ ['|' find --ignore-case $term])
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

def --env packOk [cmds: list<string>] {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  (run-external ($cmds | first) ...($cmds | skip 1) | complete | get exit_code) == 0
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
    bun => ((packExistsNpm $name) or (packExistsJsr $name)),
    deno => ((packExistsJsr $name) or (packExistsNpm $name)),
    go => (packExistsGo $name),
    brew => (packOk ([brew info] ++ $flags ++ [$name])),
    apk => (packOk [apk search -e $name]),
    apt => (packOk [apt-cache show $name]),
    dnf => (packOk [dnf info $name]),
    yay => (packOk [yay --sync --info $name]),
    paru => (packOk [paru --sync --info $name]),
    pacman => (packOk [pacman --sync --info $name]),
    xbps => (packOk [xbps-query --repository --show $name]),
    zypper => (packOk [zypper --non-interactive info $name]),
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
  let key = ($cmds | str join ' ')
  let cached = ($env.PACK_LISTED? | default [] | where key == $key | get -o 0.names)
  if $cached != null {
    return $cached
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  let names = (
    run-external ($cmds | first) ...($cmds | skip 1)
      | complete
      | get stdout
      | lines
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
# `go version -m` reads them back, so the listing is a directory read like deno's
def --env packGoTools [] {
  let gobin = (^go env GOBIN | str trim)
  let dirPath = if ($gobin | is-not-empty) {
    $gobin
  } else {
    [(^go env GOPATH | str trim | split row (char esep) | first) bin] | path join
  }
  $env.PACK_PRINTED = '1'
  opPrintCmd 'ls' $dirPath
  if not ($dirPath | path exists) {
    return []
  }
  ls $dirPath | where type == file | each { |f|
    let fields = (^go version -m $f.name | complete | get stdout | lines | each { |l| $l | str trim | split row (char tab) })
    let path = ($fields | where { |r| ($r | first) == 'path' } | get -o 0.1)
    let mod = ($fields | where { |r| ($r | first) == 'mod' } | get -o 0 | default [])
    if $path == null {
      null
    } else {
      {bin: $f.name, path: $path, module: ($mod | get -o 1 | default $path), version: ($mod | get -o 2 | default '')}
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
# two statements of it is how `list` and `remove` came to disagree about the same name. deno has no such command —
# it keeps its global installs as shim directories — so it answers through packDenoInstalled instead
def packListCmd [manager: string] {
  match $manager {
    ghpm => [ghpm list],
    cargo => [cargo install --list],
    uv => [uv tool list],
    pnpm => [pnpm list --global],
    bun => [bun list --global],
    brew => [brew list],
    apk => [apk list --installed],
    apt => [apt list --installed],
    dnf => [dnf list --installed],
    yay => [yay --query],
    paru => [paru --query],
    pacman => [pacman --query],
    xbps => [xbps-query --list-pkgs],
    # not `search --installed-only`: it can report packages as installed when they aren't
    # https://github.com/openSUSE/zypper/issues/498
    zypper => [zypper packages --installed-only],
    choco => [choco list],
    scoop => ((packScoopCmd) ++ [list]),
    winget => [winget list],
    _ => null,
  }
}

# `list`'s filter is a substring over the manager's own output — WIDE, as COMMANDS.md has it — so the check that
# answers before the gate is that same command and that same rule, and cannot drift from what gets dumped after
def --env packListedRaw [manager: string] {
  if $manager == 'deno' {
    return (packDenoInstalled)
  }
  if $manager == 'pnpm' {
    return (packPnpmInstalled)
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
  run-external ($cmds | first) ...($cmds | skip 1) | complete | get stdout | lines
}

def packLinesLike [lines: list<string>, term: string] {
  $lines | any { |l| $l | str contains --ignore-case $term }
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
  let answer = (packInstalledCheck $manager $raw)
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
    packInstalled $manager $name
  } else {
    packExists $manager $name
  }
}

def --env packRefresh [manager: string] {
  match $manager {
    ghpm => { packOp [ghpm refresh] },
    apk => { packOp [(packElevate 'apk') update] },
    apt => { packOp [(packElevate 'apt') update] },
    brew => { packOp [brew update] },
    dnf => { packOp [(packElevate 'dnf') makecache] },
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
  } else if (which $manager | is-not-empty) {
    $manager
  } else {
    null
  }
}

def packManagerHere [manager: string] {
  (packManagerBest $manager) != null
}

# the pacman family collapses to one entry, so it is never offered or run three times over
def packManagersHere [] {
  ($env.PACK_MANAGERS? | default []) | each { |m| packManagerBest $m } | compact | uniq
}

def --env packRefreshAll [] {
  for m in (packManagersHere) { packRefresh $m }
}

# the first manager here that really has it, in the order wut prefers
def --env packFindFirst [name: string] {
  packFindFirstIn (packManagersHere) $name
}

def --env packFindFirstIn [managers: list<string>, name: string] {
  for m in $managers {
    if (packClaims $m $name) { return $m }
  }
  null
}

# remove is PINPOINT — the one manager it uninstalls from — while sync is WIDE, so a name two managers both hold
# is updated in both rather than left stale in whichever sorted second.
# a `where` would read better and remember nothing: what a check learns inside a closure does not leave it
def --env packFindEvery [managers: list<string>, name: string] {
  if ($env.PACK_OP? | default '') != 'sync' {
    let winner = (packFindFirstIn $managers $name)
    return (if $winner == null { [] } else { [$winner] })
  }
  mut every = []
  for m in $managers {
    if (packClaims $m $name) {
      $every = ($every | append $m)
    }
  }
  $every
}

def --env packRunLoose [manager: string] {
  let key = $"PACK_($env.PACK_OP | str uppercase)_NAMES"
  # stated, not implied: the manager function guards on it, and sync's own guard asks it what it holds
  load-env {($key): $env.PACK_LOOSE_NAMES, PACK_MANAGER: $manager}
  packCallManager $manager
  hide-env PACK_MANAGER
}

def --env packCallManager [manager: string] {
  match $manager {
    ghpm => { packGhpm }, cargo => { packCargo }, uv => { packUv }, pnpm => { packPnpm },
    bun => { packBun }, deno => { packDeno }, go => { packGo }, brew => { packBrew }, apk => { packApk },
    apt => { packApt }, dnf => { packDnf }, yay => { packPacman }, paru => { packPacman },
    pacman => { packPacman }, xbps => { packXbps }, zypper => { packZypper },
    choco => { packChoco }, scoop => { packScoop }, winget => { packWinget }, _ => {},
  }
}


# ghpm's table: a rule as wide as each header, columns padded to their widest cell, the last one loose
def packTable [headers: list<string>, rows: list<list<string>>] {
  let widths = ($headers | enumerate | each { |h|
    [($h.item | str length)] ++ ($rows | each { |r| $r | get -o $h.index | default '' | str length }) | math max
  })
  let line = { |cells: list<string>|
    $cells | enumerate | each { |c|
      if $c.index == (($cells | length) - 1) { $c.item } else { $c.item | fill --alignment left --width ($widths | get $c.index) }
    } | str join ' '
  }
  opPrint (do $line $headers)
  opPrint (do $line ($headers | each { |h| '-' | fill --alignment left --width ($h | str length) --character '-' }))
  for r in $rows { opPrint (do $line $r) }
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
  packTable ['manager'] ($here | enumerate | each { |m| [$"($m.index + 1)\) ($m.item)"] })
  let picked = (wutSelectRead ($here | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $here | get ($i - 1) })
  $env.PACK_AGREED = '1'

  mut byManager = {}
  mut missing = []
  for name in $remaining {
    let m = (packFindFirstIn $chosen $name)
    if $m == null {
      $missing = ($missing | append $name)
    } else {
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
# remove takes the one it uninstalls from; sync is WIDE, so it takes every manager actually holding the group
def --env packPickPaths [unit: record] {
  let here = ($unit.paths | where { |p| packManagerHere $p.manager })
  if not (packOpAsksInstalled) {
    return ($here | first 1)
  }
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
      if ($env.PACK_OP? | default '') != 'sync' {
        return [$p]
      }
      $held = ($held | append $p)
    }
  }
  $held
}

def --env packPlanRun [] {
  let units = ($env.PACK_PLAN? | default '[]' | from json)

  # a group whose every path needs a manager this machine lacks is not a plan, it is an absence: drop it, and let
  # the name it came from fall through to a find like any other unclaimed name
  mut detail = []
  mut served = []
  for unit in $units {
    let paths = (packPickPaths $unit)
    if ($paths | is-not-empty) {
      $served = ($served | append $unit.name)
      for path in $paths {
        $detail = ($detail | append { manager: (packManagerBest $path.manager), group: $unit.group, id: $path.id, names: $path.names, pre: ($unit.pre? | default []), post: ($unit.post? | default []) })
      }
    }
  }
  let planned = $detail

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
      let winners = (packFindEvery $here $name)
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
      if ($d.post | is-not-empty) {
        opPrint $"    then: ($d.post | each { |s| $s.id } | str join ', ')"
      }
    }
    let own = ($looseFor | get -o $m | default [])
    if ($own | is-not-empty) {
      opPrint $"  ($own | str join ', ')"
    }
  }

  # '?' is the names no group claimed and nothing has resolved yet: only add leaves any, and only until the gate
  let choices = $planManagers ++ (if ($deferred | is-empty) { [] } else { ['?'] })
  opPrint ''
  packTable ['manager' 'packages'] ($choices | enumerate | each { |c|
    let count = if $c.item == '?' {
      $deferred | length
    } else {
      (($planned | where manager == $c.item | each { |d| $d.names } | flatten) ++ ($looseFor | get -o $c.item | default [])) | length
    }
    [$"($c.index + 1)\) ($c.item)", ($count | into string)]
  })
  let picked = (wutSelectRead ($choices | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $choices | get ($i - 1) })

  # agreed once, up front: nothing below asks again
  $env.PACK_AGREED = '1'
  # the pick is the yes: a script install, or a group's pre or post script, asks nothing further once picked
  $env.YES = '1'
  let picked = ($planned | where { |d| $d.manager in $chosen })
  # a group's pre scripts all run before any install or removal, while what they act on is still there
  packRunScripts 'pre' ($picked | each { |d| $d.pre } | flatten | uniq-by id)
  mut posts = []
  for d in $picked {
    let failedBefore = ($env.PACK_FAILED? | default [] | length)
    try {
      packRunUnit $d.id
    } catch { |e|
      packMarkFailed $d.id $e
    }
    # a group whose install or removal failed has nothing to follow it
    if ($env.PACK_FAILED? | default [] | length) == $failedBefore {
      $posts = ($posts | append $d.post)
    }
  }
  let donePosts = $posts

  # the loose names remove already resolved ride with the manager row that won them; the ones add left behind ride
  # with '?', and are searched only now, against every manager, since picking '?' is picking the search itself
  mut running = ($looseFor | transpose manager names | where { |e| $e.manager in $chosen })
  if ('?' in $chosen) and ($deferred | is-not-empty) {
    packRefreshAll
    mut found = {}
    for name in $deferred {
      let winner = (packFindFirst $name)
      if $winner == null {
        load-env {PACK_UNSERVED: (($env.PACK_UNSERVED? | default []) | append $name)}
      } else {
        $found = ($found | upsert $winner (($found | get -o $winner | default []) | append $name))
      }
    }
    $running = ($running ++ ($found | transpose manager names))
  }
  for entry in $running {
    load-env {PACK_LOOSE_NAMES: $entry.names}
    try {
      packRunLoose $entry.manager
    } catch { |e|
      packMarkFailed ($entry.names | str join ', ') $e
    }
  }
  # the installs put their commands where the env stage says they go, which the post scripts are about to look for
  if ($donePosts | is-not-empty) {
    wutPathRefresh
  }
  packRunScripts 'post' ($donePosts | uniq-by id)
  packReport
}

# post scripts run after every install or removal in the run, so one can lean on a tool another group just
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

  mut hits = {}
  for m in $here {
    let lines = (packListedRaw $m)
    let matched = ($names | where { |n| packLinesLike $lines $n })
    if ($matched | is-not-empty) {
      $hits = ($hits | upsert $m $matched)
    }
  }
  let found = $hits
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
    opPrint $"  (($found | get $m) | str join ', ')"
  }
  if ($missing | is-not-empty) {
    opPrintWarn $"no manager has installed: ($missing | str join ', ')"
  }

  opPrint ''
  packTable ['manager' 'packages'] ($managers | enumerate | each { |m|
    [$"($m.index + 1)\) ($m.item)", (($found | get $m.item) | length | into string)]
  })
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

def --env packManagerPlanRun [] {
  let managers = (packManagersHere)
  let selfHere = if ($env.PACK_OP? | default '') == 'sync' { packSelfHere } else { [] }
  # a manager's self update runs in its own row; the rest in the script row
  let selfManaged = ($selfHere | where { |s| (packSelfManager $s.path) in $managers })
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
    packTable ['manager'] ($here | enumerate | each { |m| [$"($m.index + 1)\) ($m.item)"] })
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
    for s in ($selfManaged | where { |s| (packSelfManager $s.path) == $m }) {
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

