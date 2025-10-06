function packZypperOp {
  opPrintMaybeRunCmd $1 refresh '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 search $PACK_FIND_NAMES
}
