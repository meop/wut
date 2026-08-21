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

# a group is done once some manager (or script) installed it, and failed once a manager was missing a name it
# declared — either way no later phase offers it again
def packGroupSettled [group: string] {
  ($group in ($env.PACK_DONE? | default [])) or ($group in ($env.PACK_FAIL? | default []))
}

def --env packMarkDone [group: string] {
  load-env {PACK_DONE: (($env.PACK_DONE? | default []) | append $group | uniq)}
}

def --env packMarkFail [group: string, why: string] {
  load-env {
    PACK_FAIL: (($env.PACK_FAIL? | default []) | append $group | uniq)
    PACK_FAIL_WHY: (($env.PACK_FAIL_WHY? | default []) | append $"($group): ($why)")
  }
}

# flags (eg brew's --cask) aren't package names and can't be verified via the finder — always pass them through
def packFindable [term: string, finder: closure] {
  ($term | str starts-with '-') or (do $finder $term)
}

def packNothingToDo [key: string] {
  let planned = (packPlanFor $key | is-empty)
  match $env.PACK_OP {
    add => (($env.PACK_ADD_NAMES? | is-empty) and $planned),
    remove => (($env.PACK_REMOVE_NAMES? | is-empty) and $planned),
    _ => false,
  }
}

def packPlanFor [key: string] {
  $env.PACK_PLAN? | default '{}' | from json | get -o $key | default []
}

def --env packMutate [
  key: string,
  label: string,
  names_key: string,
  finder: closure,
  cmds: list<string>,
  each: bool,
] {
  # a group states exactly what this manager installs, so a name it cannot find is a stale group, not a fallback
  mut ready = []
  for entry in (packPlanFor $key) {
    if (packGroupSettled $entry.group) {
      continue
    }
    let missing = ($entry.names | where { |n| not (packFindable $n $finder) })
    if ($missing | is-empty) {
      $ready = ($ready | append $entry)
    } else {
      packMarkFail $entry.group $"($key) has no ($missing | str join ', ')"
    }
  }

  # loose names have no manager stated for them, so each one is offered wherever it turns up first
  let names = ($env | get -o $names_key | default [])
  let found = ($names | where { |n| packFindable $n $finder })

  let offer = (($ready | each { |e| $e.names } | flatten) ++ $found | uniq)
  if ($offer | is-empty) {
    return
  }
  if not (packPrompt $"($label): ($offer | str join ', ')") {
    return
  }

  # one command per group keeps a group's flags scoped to its own names
  for entry in $ready {
    if $each {
      for n in $entry.names { packOp ($cmds ++ [$n]) }
    } else {
      packOp ($cmds ++ $entry.names)
    }
    packMarkDone $entry.group
  }
  if ($found | is-not-empty) {
    if $each {
      for n in $found { packOp ($cmds ++ [$n]) }
    } else {
      packOp ($cmds ++ $found)
    }
  }

  # an empty list, not hide-env: a removal does not survive the nested def --env chain, an assignment does
  load-env {($names_key): ($names | where { |n| $n not-in $found })}
}

# a group with no candidate managers is script satisfied, so it always shows
# asked for by name but not here: say so, rather than doing nothing quietly
def packRequireManager [...cmds: string] {
  let missing = ($cmds | where { |c| which $c | is-empty })
  if ($missing | is-not-empty) {
    opPrintWarn $"manager not installed: ($missing | str join ', ')"
  }
}

def packFindGroup [label: string, ...cmds: string] {
  if ($cmds | is-empty) or ($cmds | any { |c| which $c | is-not-empty }) {
    opPrint $label
  }
}

def packReport [] {
  let done = ($env.PACK_DONE? | default [])
  let failed = ($env.PACK_FAIL? | default [])
  let pending = (($env.PACK_GROUPS? | default []) | where { |g| $g not-in $done and $g not-in $failed })
  let loose = ($env.PACK_ADD_NAMES? | default []) ++ ($env.PACK_REMOVE_NAMES? | default [])

  if ($env.PACK_FAIL_WHY? | default [] | is-not-empty) {
    opPrintErr 'stale group(s), fix the config:'
    for why in $env.PACK_FAIL_WHY { opPrintErr $"  ($why)" }
  }
  if ($pending | is-not-empty) {
    opPrintWarn 'declined everywhere:'
    opPrintWarn $"  ($pending | str join ', ')"
  }
  if ($loose | is-not-empty) {
    opPrintWarn 'no manager had:'
    opPrintWarn $"  ($loose | str join ', ')"
  }
}

def --env packOp [cmds: list<string>] {
  opPrintMaybeRunCmd try '{' ...$cmds '}'
}

def --env packOpAdd [key: string, label: string, finder: closure, cmds: list<string>, --each] {
  packMutate $key $label PACK_ADD_NAMES $finder $cmds $each
}

def --env packOpFind [cmds: list<string>] {
  for term in $env.PACK_FIND_NAMES {
    packDo ($cmds ++ [$term])
  }
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
    $yn = input $"($label) [y,[n]]: "
  }
  ($yn | str lowercase) in ['', 'y', 'yes']
}
