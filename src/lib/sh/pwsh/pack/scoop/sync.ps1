function packScoopOp ($cmd) {
  opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
  if ($PACK_SYNC_NAMES) {
    opPrintMaybeRunCmd $cmd update $PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd update --all
  }
}
