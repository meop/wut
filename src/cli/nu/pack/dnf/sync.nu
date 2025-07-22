def packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd check-upgrade '|' complete '|' ignore
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd upgrade $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd distro-sync
  }
}
