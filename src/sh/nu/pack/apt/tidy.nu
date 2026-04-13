def --env packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd clean
  opPrintMaybeRunCmd $cmd autoremove
}
