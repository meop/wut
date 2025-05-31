function packScoopOp ($cmd) {
  opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
  opPrintMaybeRunCmd $cmd search $PACK_FIND_NAMES
}
