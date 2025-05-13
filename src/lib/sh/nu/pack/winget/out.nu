def packWingetOp [cmd] {
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd upgrade '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd upgrade
  }
}
