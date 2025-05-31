def packAptOp [cmd] {
  if 'PACK_ADD_GROUP_NAMES' in $env {
    for name in $env.PACK_ADD_GROUP_NAMES {
      opPrintMaybeRunCmd ...($name | split row ' ')
    }
  }
  opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd install $env.PACK_ADD_NAMES
}
