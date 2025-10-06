def packZypperOp [cmd] {
  opPrintMaybeRunCmd $cmd refresh '|' complete '|' ignore
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list-updates '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list-updates
  }
}
