def packBrewOp [cmd] {
  if 'PACK_LIST_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list '|' find --ignore-case $env.PACK_LIST_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
