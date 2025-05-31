def packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd check-update '|' complete '|' ignore
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list --upgrades
  }
}
