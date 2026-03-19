def --env packDnfOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $cmd upgrade $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd distro-sync
  }
}
