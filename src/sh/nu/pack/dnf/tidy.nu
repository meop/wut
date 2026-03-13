def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd autoremove
  opPrintMaybeRunCmd $cmd clean packages
}
