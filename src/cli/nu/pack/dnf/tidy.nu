def packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd clean dbcache
  opPrintMaybeRunCmd $cmd autoremove
}
