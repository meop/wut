def fileOp [] {
  for pair in $env.FILE_LIST_PATH_PAIRS {
    let pairParts = $pair | split row '|'

    mut bin = ''
    for alias in ($pairParts.0 | split row ',') {
      if (which $alias | is-not-empty) {
        $bin = $alias
        break
      }
    }
    if ($bin | is-empty) {
      continue
    }

    let src = $pairParts.1 | str trim --left --char '/'
    let dstFilePath = replaceEnv $pairParts.2 | path expand

    opPrint $"($src) -> ($dstFilePath)"
  }
}
