def --env packAptOp [cmd] {
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd install $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd full-upgrade
  }
}
