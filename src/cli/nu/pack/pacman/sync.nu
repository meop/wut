def packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd --sync --sysupgrade
  }
}
