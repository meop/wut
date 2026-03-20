def --env packApkOp [cmd] {
  if ($env.PACK_SYNC_NAMES? | is-not-empty) {
    opPrintMaybeRunCmd $cmd add $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade
  }
}
