def --env packDo [cmds: list<string>] {
  opPrintRunCmd try '{' ...$cmds '}'
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
def --env packOk [cmds: list<string>] {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  (run-external ($cmds | first) ...($cmds | skip 1) | complete | get exit_code) == 0
}

def --env packHttpOk [url: string] {
  $env.PACK_PRINTED = '1'
  opPrintCmd 'http get' $url
  let res = (try { http get --full --redirect-mode follow $url } catch { null })
  ($res != null) and ($res.status == 200)
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

def --env packExistsPypi [name: string] {
  packHttpOk $"https://pypi.org/pypi/($name)/json"
}

# scoop dispatches subcommands with `& $cmd_path`, so a subcommand's `exit 1` ends only that nested script and
# scoop.ps1 still completes 0. the code survives only as $LASTEXITCODE, which -Command exits with
# https://github.com/ScoopInstaller/Scoop/issues/3936
def packScoopCmd [] {
  ['powershell' '-NoProfile' '-Command' 'scoop']
}

# choosing a manager needs an exact name, not the substring search 'find' runs: pacman has nushell, not nushel
def --env packExists [manager: string, name: string] {
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
    brew => (packOk [brew info $name]),
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
# what they name, not by an exit code
def --env packListedNames [cmds: list<string>, keep: closure] {
  $env.PACK_PRINTED = '1'
  opPrintCmd ...$cmds
  run-external ($cmds | first) ...($cmds | skip 1)
    | complete
    | get stdout
    | lines
    | each { |l| do $keep $l }
    | compact
    | where { is-not-empty }
}

def --env packListedHas [cmds: list<string>, name: string, keep: closure] {
  (packListedNames $cmds $keep) | any { |n| ($n | str lowercase) == ($name | str lowercase) }
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
  let dirPath = ([$env.HOME '.deno' bin] | path join)
  $env.PACK_PRINTED = '1'
  opPrintCmd 'ls' $dirPath
  if not ($dirPath | path exists) {
    return []
  }
  ls $dirPath | where type == dir | get name | path basename | str substring 1..
}

def --env packInstalledDeno [name: string] {
  (packDenoInstalled) | any { |n| $n == $name }
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
# one that actually has it here. every check is local, so the plan can run them before it asks rather than after
def --env packInstalled [manager: string, name: string] {
  match $manager {
    ghpm => (packListedHas [ghpm list --long-names] $name { |l| $l | str trim }),
    cargo => (packListedHas (packListCmd 'cargo') $name { |l| packListedHead $l }),
    uv => (packListedHas (packListCmd 'uv') $name { |l| packListedHead $l }),
    pnpm => (packListedHas (packListCmd 'pnpm') $name { |l| packListedNodeName $l }),
    bun => (packListedHas (packListCmd 'bun') $name { |l| packListedNodeName $l }),
    deno => (packInstalledDeno $name),
    brew => (packOk [brew list --versions $name]),
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

# add asks who could serve a name, remove asks who already has it; the walk over managers is the same either way
def --env packClaims [manager: string, name: string] {
  if ($env.PACK_OP? | default '') == 'remove' {
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

const PACK_PACMAN_FAMILY = ['paru', 'yay', 'pacman']

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

def --env packRunLoose [manager: string] {
  let key = $"PACK_($env.PACK_OP | str uppercase)_NAMES"
  load-env {($key): $env.PACK_LOOSE_NAMES}
  packCallManager $manager
}

def --env packCallManager [manager: string] {
  match $manager {
    ghpm => { packGhpm }, cargo => { packCargo }, uv => { packUv }, pnpm => { packPnpm },
    bun => { packBun }, deno => { packDeno }, brew => { packBrew }, apk => { packApk },
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

# the first path whose manager is on this machine wins the group, in the order the group stated. removing narrows
# that: a manager that never installed the group is not the one to uninstall it from, however present it is
def --env packPickPath [unit: record] {
  let here = ($unit.paths | where { |p| packManagerHere $p.manager })
  if ($env.PACK_OP? | default '') != 'remove' {
    return ($here | first 1 | get -o 0)
  }
  for p in $here {
    let m = (packManagerBest $p.manager)
    if ($p.names | any { |n| packInstalled $m $n }) {
      return $p
    }
  }
  null
}

def --env packPlanRun [] {
  let units = ($env.PACK_PLAN? | default '[]' | from json)

  # a group whose every path needs a manager this machine lacks is not a plan, it is an absence: drop it, and let
  # the name it came from fall through to a find like any other unclaimed name
  mut detail = []
  mut served = []
  for unit in $units {
    let path = (packPickPath $unit)
    if $path != null {
      $served = ($served | append $unit.name)
      $detail = ($detail | append { manager: (packManagerBest $path.manager), group: $unit.group, id: $path.id, names: $path.names })
    }
  }
  let planned = $detail

  let fellThrough = ($units | each { |u| $u.name } | uniq | where { |n| $n not-in $served })
  let loose = ((packNameList 'PACK_ADD_NAMES') ++ (packNameList 'PACK_REMOVE_NAMES') ++ $fellThrough | uniq)

  # remove asks its managers a local question — what is installed — so the answer is affordable before the gate and
  # belongs in the table, named. add asks the registries, a round trip per manager per name, so those names wait
  # behind '?' and are only searched once something has been picked
  mut resolved = {}
  mut unresolved = []
  if (($env.PACK_OP? | default '') == 'remove') and ($loose | is-not-empty) {
    let here = (packManagersHere)
    for name in $loose {
      let winner = (packFindFirstIn $here $name)
      if $winner == null {
        $unresolved = ($unresolved | append $name)
      } else {
        $resolved = ($resolved | upsert $winner (($resolved | get -o $winner | default []) | append $name))
      }
    }
  }
  let looseFor = $resolved
  let deferred = if (($env.PACK_OP? | default '') == 'remove') { [] } else { $loose }
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
  for d in ($planned | where { |d| $d.manager in $chosen }) {
    try {
      packRunUnit $d.id
    } catch { |e|
      packMarkFailed $d.id $e.msg
    }
  }

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
      packMarkFailed ($entry.names | str join ', ') $e.msg
    }
  }
  packReport
}

# `list` is the one read op whose whole answer is local: which managers have something matching is the same listing
# it was going to dump, so it runs before the gate and the table names the managers rather than offering all of them.
# a bare `list` has nothing cheaper than the dump itself, so there the only question left is which managers to run
def --env packListPlanRun [] {
  let names = (packNameList 'PACK_LIST_NAMES')
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
    # only the terms this manager actually matched, so its dump has nothing in it that came back empty
    load-env {PACK_LIST_NAMES: ($found | get $m)}
    try {
      packCallManager $m
    } catch { |e|
      packMarkFailed $m $e.msg
    }
  }
  packReport
}

# sync, tidy, outdated and info know nothing until a manager runs, so there is no detail to show first:
# the only question is which managers this run touches
def --env packManagerPlanRun [] {
  let here = (packManagersHere)
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
    try {
      packCallManager $m
    } catch { |e|
      packMarkFailed $m $e.msg
    }
  }
  packReport
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
  if $each {
    for n in $names { packOpStrict ($cmds ++ [$n]) }
  } else {
    packOpStrict ($cmds ++ $names)
  }
  load-env {($names_key): []}
}

def --env packMarkFailed [what: string, why: string] {
  load-env {PACK_FAILED: (($env.PACK_FAILED? | default []) | append $"($what): ($why | lines | first)")}
}

# only the exceptions: a clean run says nothing
def packReport [] {
  let unserved = ($env.PACK_UNSERVED? | default [])
  let failed = ($env.PACK_FAILED? | default [])
  if ($unserved | is-not-empty) {
    if ($env.PACK_OP? | default '') == 'remove' {
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
  opPrintMaybeRunCmd try '{' ...$cmds '}'
}

def --env packOpAdd [cmds: list<string>, --each] {
  packMutate PACK_ADD_NAMES $cmds $each
}

def --env packOpInfo [cmds: list<string>] {
  for term in $env.PACK_INFO_NAMES {
    packDo ($cmds ++ [$term])
  }
}

def --env packOpList [cmds: list<string>] {
  packFiltered $cmds ($env.PACK_LIST_NAMES? | default [])
}

def --env packOpOutdated [cmds: list<string>] {
  packFiltered $cmds ($env.PACK_OUTDATED_NAMES? | default [])
}

def --env packOpRemove [cmds: list<string>, --each] {
  packMutate PACK_REMOVE_NAMES $cmds $each
}

def --env packOpSync [cmdsNoArgs: list<string>, cmds: list<string>, --each] {
  if ($env.PACK_SYNC_NAMES? | is-empty) {
    packOp $cmdsNoArgs
    return
  }
  if $each {
    for n in $env.PACK_SYNC_NAMES {
      packOp ($cmds ++ [$n])
    }
  } else {
    packOp ($cmds ++ $env.PACK_SYNC_NAMES)
  }
}

