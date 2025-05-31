function packAptOp {
  opPrintMaybeRunCmd $1 update '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 search $PACK_FIND_NAMES
}
