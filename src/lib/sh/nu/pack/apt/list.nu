def packAptOp [cmd] {
  if 'PACK_LIST_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list --installed '|' complate '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_LIST_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list --installed
  }
}
