def packBrewOp [cmd] {
  opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd upgrade --greedy $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade --greedy
  }
}
