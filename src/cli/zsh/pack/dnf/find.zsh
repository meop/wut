function packDnfOp {
  opPrintMaybeRunCmd $1 check-upgrade '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 search $PACK_FIND_NAMES
}
