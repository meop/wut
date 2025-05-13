function packDnfOp {
  opPrintMaybeRunCmd $1 clean dbcache
  opPrintMaybeRunCmd $1 autoremove
}
