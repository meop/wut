def packDnfOp [cmd] {
  # opPrintMaybeRunCmd $cmd clean packages
  opPrintMaybeRunCmd $cmd autoremove
}
