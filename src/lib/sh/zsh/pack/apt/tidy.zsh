function packAptOp {
  opPrintMaybeRunCmd $1 autoclean
  opPrintMaybeRunCmd $1 autoremove
}
