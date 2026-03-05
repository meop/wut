def packChocoOp [cmd] {
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd outdated '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd outdated
  }
}
