def --env packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd autoclean
  opPrintMaybeRunCmd $cmd clean
  opPrintMaybeRunCmd $cmd autoremove
}
