def --env packZypperOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $cmd install $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd update
  }
}
