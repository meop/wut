def packPacmanOp [cmd] {
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd do --ignore-errors '{' $cmd --query --upgrades '|' find --ignore-case $env.PACK_OUT_NAMES '}'
  } else {
    opPrintMaybeRunCmd do --ignore-errors '{' $cmd --query --upgrades '}'
  }
}
