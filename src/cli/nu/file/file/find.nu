def fileOp [] {
  for key in $env.FILE_FIND_KEYS {
    mut bin = ''
    for alias in ($key | split row ',') {
      if (which $alias | is-not-empty) {
        $bin = $alias
        break
      }
    }
    if ($bin | is-empty) {
      continue
    }

    opPrint $bin
  }
}
