def --env packBrewOp [cmd] {
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd upgrade --greedy $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade --greedy
  }
}
