def packScoopOp [cmd] {
  opPrintMaybeRunCmd $cmd cleanup --all --cache
}
