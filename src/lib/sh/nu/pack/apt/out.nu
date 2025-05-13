def packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
  if 'PACK_OUT_NAMES' in $env {
    opPrintMaybeRunCmd $cmd list --upgradable '|' complete '|' get stdout '|' str trim --right '|' find --ignore-case $env.PACK_OUT_NAMES
  } else {
    opPrintMaybeRunCmd $cmd list --upgradable
  }
}
