def packWingetOp [cmd] {
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd upgrade $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade --all
  }
}
