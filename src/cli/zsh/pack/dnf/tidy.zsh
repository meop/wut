function packDnfOp {
  opPrintMaybeRunCmd $1 autoremove
  opPrintMaybeRunCmd $1 clean packages
}
