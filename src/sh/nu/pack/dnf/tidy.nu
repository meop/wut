def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd clean packages
  opPrintMaybeRunCmd $cmd clean all
  opPrintMaybeRunCmd $cmd autoremove
}
