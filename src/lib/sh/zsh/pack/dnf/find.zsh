function packDnfOp {
  opPrintMaybeRunCmd $1 check-update '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 search $PACK_FIND_NAMES
}
