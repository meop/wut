def packBrewOp [cmd] {
  opPrintMaybeRunCmd $cmd cleanup --prune=all
}
