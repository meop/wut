def --env packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd autoclean
  opPrintMaybeRunCmd $cmd autoremove
}
