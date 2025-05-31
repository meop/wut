def packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd --query --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd --query --upgrades
  }
}
