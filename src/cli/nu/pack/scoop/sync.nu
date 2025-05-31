def packScoopOp [cmd] {
  opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
  if 'PACK_SYNC_NAMES' in $env {
    opPrintMaybeRunCmd $cmd update $env.PACK_SYNC_NAMES
  } else {
    opPrintMaybeRunCmd $cmd update --all
  }
}
