def packPrompt [label: string] {
  mut yn = ''
  if YES in $env {
    $yn = 'y'
  } else {
    $yn = input $"($label) [y,[n]]: "
  }
  $yn != n
}

def packSudoCmd [cmd: string] {
  if (which sudo | is-not-empty) { $"sudo ($cmd)" } else { $cmd }
}

const packQueryLimit = 10

def packQueryNpm [term: string] {
  http get $"https://registry.npmjs.org/-/v1/search?text=($term)&size=($packQueryLimit)"
    | get objects
    | each { |p| {registry: 'npm', name: $p.package.name, version: $p.package.version, description: ($p.package.description? | default '')} }
}

def packQueryJsr [term: string] {
  http get $"https://api.jsr.io/packages?query=($term)&limit=($packQueryLimit)"
    | get items
    | each { |p| {registry: 'jsr', name: $"@($p.scope)/($p.name)", version: ($p.latestVersion? | default ''), description: ($p.description? | default '')} }
}

def packQueryPypi [term: string] {
  let res = try { http get --full $"https://pypi.org/pypi/($term)/json" } catch { null }
  if $res == null or $res.status == 404 { return [] }
  let info = $res.body.info
  [{registry: 'pypi', name: $info.name, version: $info.version, description: ($info.summary? | default '')}]
}

def --env packOp [cmds: list<string>] {
  opPrintMaybeRunCmd try '{' ...$cmds '}'
}

def packSearch [cmdsFind: list<string>, term: string] {
  run-external ($cmdsFind | first) ...($cmdsFind | skip 1) $term
    | complete
    | get stdout
    | lines
    | any { |line| ($line | str contains --ignore-case $term) }
}

def packInstalled [cmdsList: list<string>, term: string] {
  run-external ($cmdsList | first) ...($cmdsList | skip 1)
    | complete
    | get stdout
    | lines
    | any { |line| ($line | str contains --ignore-case $term) }
}

def --env packOpAdd [
  finder: closure,
  cmds: list<string>,
] {
  mut toAdd = []
  for term in $env.PACK_ADD_NAMES {
    if (do $finder $term) {
      $toAdd = ($toAdd | append $term)
    } else {
      print $"($term): not found"
    }
  }
  if ($toAdd | is-not-empty) {
    opPrintMaybeRunCmd ...$cmds $toAdd
  }
  let remains = ($env.PACK_ADD_NAMES | where { |n| $n not-in $toAdd })
  if ($remains | is-empty) {
    hide-env PACK_ADD_NAMES
    return
  }
  $env.PACK_ADD_NAMES = $remains
}

def --env packOpFind [cmds: list<string>] {
  for term in $env.PACK_FIND_NAMES {
    opPrintRunCmd try '{' ...$cmds $term '}'
  }
}

def --env packOpList [cmds: list<string>] {
  if ($env.PACK_LIST_NAMES? | is-empty) {
    opPrintRunCmd try '{' ...$cmds '}'
    return
  }
  for term in $env.PACK_LIST_NAMES {
    opPrintRunCmd try '{' ...$cmds '|' find --ignore-case $term '}'
  }
}

def --env packOpOutdated [cmds: list<string>] {
  if ($env.PACK_OUTDATED_NAMES? | is-empty) {
    opPrintRunCmd try '{' ...$cmds '}'
    return
  }
  for term in $env.PACK_OUTDATED_NAMES {
    opPrintRunCmd try '{' ...$cmds '|' find --ignore-case $term '}'
  }
}

def --env packOpRemove [finder: closure, cmds: list<string>] {
  mut toRem = []
  for term in $env.PACK_REMOVE_NAMES {
    if (do $finder $term) {
      $toRem = ($toRem | append $term)
    } else {
      print $"($term): not installed"
    }
  }
  if ($toRem | is-not-empty) {
    opPrintMaybeRunCmd ...$cmds $toRem
  }
  let remains = ($env.PACK_REMOVE_NAMES | where { |n| $n not-in $toRem })
  if ($remains | is-empty) {
    hide-env PACK_REMOVE_NAMES
    return
  }
  $env.PACK_REMOVE_NAMES = $remains
}

def --env packOpSync [cmdsNoArgs: list<string>, cmds: list<string>] {
  if ($env.PACK_SYNC_NAMES? | is-empty) {
    packOp $cmdsNoArgs
    return
  }
  packOp ($cmds ++ $env.PACK_SYNC_NAMES)
}

