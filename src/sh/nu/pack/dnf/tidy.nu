def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd clean all
  opPrintMaybeRunCmd $cmd autoremove
}
