def --env packScoopOp [cmd] {
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd update $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd update --all
  }
}
