def fileOp [] {
  for key in $env.FILE_FIND_KEYS {
    if (which $key | is-empty) {
      continue
    }
    opPrint $key
  }
}
