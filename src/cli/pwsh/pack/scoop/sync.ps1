function packScoopOp ($cmd) {
  if ($PACK_SYNC_NAMES) {
    opPrintMaybeRunCmd $cmd update $PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd update --all
  }
}
