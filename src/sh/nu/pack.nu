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

def packGrep [cmds: list<string>, term: string] {
  run-external ($cmds | first) ...($cmds | skip 1)
    | complete
    | get stdout
    | lines
    | any { |line| ($line | str contains --ignore-case $term) }
}

def packGrepFind [cmds: list<string>, term: string] {
  packGrep ($cmds ++ [$term]) $term
}

def packGrepList [cmds: list<string>, term: string] {
  packGrep $cmds $term
}

const PACK_HTTP_GET_LIMIT = 10

def packHttpGet [url: string, transform: closure] {
  let res = try { http get --full $url } catch { null }
  if $res == null or $res.status != 200 { return [] }
  do $transform $res.body
}

def packHttpGetNpm [term: string] {
  packHttpGet $"https://registry.npmjs.org/-/v1/search?text=($term)&size=($PACK_HTTP_GET_LIMIT)" { |body|
    $body | get objects
      | each { |p| {registry: 'npm', name: $p.package.name, version: $p.package.version, description: ($p.package.description? | default '')} }
  }
}

def packHttpGetJsr [term: string] {
  packHttpGet $"https://api.jsr.io/packages?query=($term)&limit=($PACK_HTTP_GET_LIMIT)" { |body|
    $body | get items
      | each { |p| {registry: 'jsr', name: $"@($p.scope)/($p.name)", version: ($p.latestVersion? | default ''), description: ($p.description? | default '')} }
  }
}

def packHttpGetPypi [term: string] {
  packHttpGet $"https://pypi.org/pypi/($term)/json" { |body|
    let info = $body.info
    [{registry: 'pypi', name: $info.name, version: $info.version, description: ($info.summary? | default '')}]
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
    scoop => { packOp [(packScoopCmd) update] },
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

def packManagersHere [] {
  ($env.PACK_MANAGERS? | default []) | where { |m| which $m | is-not-empty }
}

def --env packRefreshAll [] {
  for m in (packManagersHere) { packRefresh $m }
}

# the first manager here that really has it, in the order wut prefers
def --env packFindFirst [name: string] {
  for m in (packManagersHere) {
    if (packExists $m $name) { return $m }
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

def --env packRequireManager [...names: string] {
  for name in $names {
    if (which $name | is-empty) {
      $env.PACK_PRINTED = '1'
      opPrintWarn $"manager not installed: ($name)"
    }
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

def packManagerHere [manager: string] {
  # a script is gated by the server, so if it reached the plan this machine can run it
  ($manager == 'script') or (which $manager | is-not-empty)
}

def packFindWinner [candidates: list] {
  $candidates | where { |c| packManagerHere $c.manager } | first 1 | get -o 0
}

def --env packFindRun [] {
  let parsed = ($env.PACK_FIND? | default '{"groups":{},"remaining":[]}' | from json)
  let remaining = ($parsed.remaining? | default [])
  let groups = (
    $parsed.groups | transpose label candidates
      | each { |g| { label: $g.label, winner: (packFindWinner $g.candidates) } }
      | where { |g| $g.winner != null }
  )
  if ($groups | is-empty) and ($remaining | is-empty) {
    return
  }

  let byManager = ($groups | group-by { |g| $g.winner.manager } | transpose manager entries)
  # '?' stands for the typed names no group claimed, which no manager has answered for yet
  let choices = ($byManager | each { |m| $m.manager }) ++ (if ($remaining | is-empty) { [] } else { ['?'] })
  packTable ['manager' 'groups'] ($choices | enumerate | each { |c|
    let count = if $c.item == '?' {
      $remaining | length
    } else {
      $byManager | where manager == $c.item | get 0.entries | length
    }
    [$"($c.index + 1)\) ($c.item)", ($count | into string)]
  })
  let picked = (wutSelectRead ($choices | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $choices | get ($i - 1) })
  $env.PACK_AGREED = '1'

  for g in ($groups | where { |g| $g.winner.manager in $chosen }) {
    opPrint $g.label
    opPrint $"  ($g.winner.manager)"
    opPrint $"    ($g.winner.pkg)"
  }

  if ($remaining | is-empty) or ('?' not-in $chosen) {
    return
  }
  opPrint ''
  mut byManager = {}
  mut missing = []
  for name in $remaining {
    let m = (packFindFirst $name)
    if $m == null {
      $missing = ($missing | append $name)
    } else {
      $byManager = ($byManager | upsert $m (($byManager | get -o $m | default []) | append $name))
    }
  }
  for m in ($byManager | columns) {
    opPrint $m
    opPrint $"  (($byManager | get $m) | str join ', ')"
  }
  if ($missing | is-not-empty) {
    opPrint '?'
    opPrint $"  ($missing | str join ', ')"
  }
}

# the first path whose manager is on this machine wins the group, in the order the group stated
def packPickPath [unit: record] {
  $unit.paths | where { |p| packManagerHere $p.manager } | first 1 | get -o 0
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
      $detail = ($detail | append { manager: $path.manager, group: $unit.group, id: $path.id, names: $path.names })
    }
  }

  let fellThrough = ($units | each { |u| $u.name } | uniq | where { |n| $n not-in $served })
  let loose = ((packNameList 'PACK_ADD_NAMES') ++ (packNameList 'PACK_REMOVE_NAMES') ++ $fellThrough | uniq)

  mut looseFor = {}
  if ($loose | is-not-empty) {
    packRefreshAll
    for name in $loose {
      let winner = (packFindFirst $name)
      if $winner == null {
        load-env {PACK_UNSERVED: (($env.PACK_UNSERVED? | default []) | append $name)}
      } else {
        $looseFor = ($looseFor | upsert $winner (($looseFor | get -o $winner | default []) | append $name))
      }
    }
  }

  let units = $detail
  let looseNames = $looseFor
  # one row per manager, in the order wut prefers them, so the numbers pick a manager and everything it won
  let unitManagers = ($units | each { |d| $d.manager })
  let here = (packManagersHere | where { |m| ($m in $unitManagers) or ($m in ($looseNames | columns)) })
  let managers = if 'script' in $unitManagers { ['script'] ++ $here } else { $here }
  if ($managers | is-empty) {
    packReport
    return
  }

  if 'PACK_PRINTED' in $env {
    opPrint ''
  }
  packTable ['manager' 'packages'] ($managers | enumerate | each { |m|
    let owned = ($units | where manager == $m.item | each { |d| $d.names } | flatten)
    let loose = ($looseNames | get -o $m.item | default [])
    [$"($m.index + 1)\) ($m.item)", (($owned ++ $loose) | str join ', ')]
  })
  let picked = (wutSelectRead ($managers | length))
  if $picked == null {
    return
  }
  let chosen = ($picked | each { |i| $managers | get ($i - 1) })

  # agreed once, up front: nothing below asks again
  $env.PACK_AGREED = '1'
  for d in ($units | where { |d| $d.manager in $chosen }) {
    try {
      packRunUnit $d.id
    } catch { |e|
      packMarkFailed $d.id $e.msg
    }
  }
  for entry in ($looseNames | transpose manager names | where { |e| $e.manager in $chosen }) {
    load-env {PACK_LOOSE_NAMES: $entry.names}
    try {
      packRunLoose $entry.manager
    } catch { |e|
      packMarkFailed ($entry.names | str join ', ') $e.msg
    }
  }
  packReport
}

# the manager-only plan: sync, tidy, list, outdated, info, and a named find all share it, since none of them
# has a per-package decision to make — the only question is which managers this run touches
def --env packManagerPlanRun [] {
  let here = (packManagersHere)
  if ($here | is-empty) {
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

def packNothingToDo [key: string] {
  match $env.PACK_OP {
    add => ((packNameList 'PACK_ADD_NAMES') | is-empty),
    remove => ((packNameList 'PACK_REMOVE_NAMES') | is-empty),
    _ => false,
  }
}

# by the time a manager runs, the plan has chosen it and the user has already agreed
def --env packMutate [
  key: string,
  label: string,
  names_key: string,
  finder: closure,
  cmds: list<string>,
  each: bool,
] {
  let names = (packNameList $names_key)
  if ($names | is-empty) {
    return
  }
  if ('PACK_AGREED' not-in $env) and not (packPrompt $"($label): ($names | str join ', ')") {
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
    opPrintWarn $"no manager had: ($unserved | str join ', ')"
  }
  if ($failed | is-not-empty) {
    opPrintErr 'failed:'
    for f in $failed { opPrintErr $"  ($f)" }
  }
  # a name nothing carries is an answer, not a failure of the run, so only a real failure exits non-zero
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

def --env packOpAdd [key: string, label: string, finder: closure, cmds: list<string>, --each] {
  packMutate $key $label PACK_ADD_NAMES $finder $cmds $each
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

def --env packOpRemove [key: string, label: string, finder: closure, cmds: list<string>, --each] {
  packMutate $key $label PACK_REMOVE_NAMES $finder $cmds $each
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

def packPrompt [label: string] {
  mut yn = ''
  if YES in $env {
    $yn = 'y'
  } else {
    opPrint ''
    $yn = input $"($label) [y,[n]]: "
  }
  ($yn | str lowercase) in ['', 'y', 'yes']
}
