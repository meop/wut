function packChocoOp ($cmd) {
  if ($PACK_SYNC_NAMES) {
    opPrintMaybeRunCmd $cmd upgrade $PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade all
  }
}
