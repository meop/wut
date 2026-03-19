def --env packBrewOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $cmd upgrade --greedy $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade --greedy
  }
}
