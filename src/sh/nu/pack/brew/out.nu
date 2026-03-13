def --env packBrewOp [cmd] {
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd do --ignore-errors '{' $cmd outdated '|' find --ignore-case $env.PACK_OUT_NAMES '}'
  } else {
    opPrintMaybeRunCmd do --ignore-errors '{' $cmd outdated '}'
  }
}
