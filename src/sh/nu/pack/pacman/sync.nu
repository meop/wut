def --env packPacmanOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd --sync --sysupgrade
  }
}
