def fileOp [] {
  for entry in $env.FILE_FIND_KEYS {
    let parts = $entry | split row '|'
    let keys = $parts | get 0
    let ins = if ($parts | length) > 1 { $parts | get 1 } else { '' }

    mut bin = ''
    for alias in ($keys | split row ',') {
      if (which $alias | is-not-empty) {
        $bin = $alias
        break
      }
    }
    if ($bin | is-empty) {
      continue
    }

    opPrint $bin
    if ($ins | is-not-empty) {
      opPrint $"  ($ins)"
    }
  }
}
