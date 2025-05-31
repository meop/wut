def packScoopOp [cmd] {
  if 'PACK_LIST_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_LIST_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
