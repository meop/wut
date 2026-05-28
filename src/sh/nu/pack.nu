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

def --env packMutate [
  names_key: string,
  miss_msg: string,
  finder: closure,
  cmds: list<string>,
  each: bool,
] {
  let names = $env | get $names_key
  mut found = []
  for term in $names {
    if (do $finder $term) {
      $found = ($found | append $term)
    } else {
      print $"($term): ($miss_msg)"
    }
  }
  if ($found | is-not-empty) {
    if $each {
      for n in $found {
        packOp ($cmds ++ [$n])
      }
    } else {
      packOp ($cmds ++ $found)
    }
  }
  let remains = ($names | where { |n| $n not-in $found })
  if ($remains | is-empty) {
    hide-env $names_key
    return
  }
  load-env {($names_key): $remains}
}

def --env packOp [cmds: list<string>] {
  opPrintMaybeRunCmd try '{' ...$cmds '}'
}

def --env packOpAdd [finder: closure, cmds: list<string>, --each] {
  packMutate PACK_ADD_NAMES 'not found' $finder $cmds $each
}

def --env packOpFind [cmds: list<string>] {
  for term in $env.PACK_FIND_NAMES {
    packDo ($cmds ++ [$term])
  }
}

def --env packOpList [cmds: list<string>] {
  packFiltered $cmds ($env.PACK_LIST_NAMES? | default [])
}

def --env packOpOutdated [cmds: list<string>] {
  packFiltered $cmds ($env.PACK_OUTDATED_NAMES? | default [])
}

def --env packOpRemove [finder: closure, cmds: list<string>, --each] {
  packMutate PACK_REMOVE_NAMES 'not installed' $finder $cmds $each
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
  $yn != n
}
