def packPacmanOp [cmd] {
  if 'PACK_ADD_GROUP_NAMES' in $env {
    for name in $env.PACK_ADD_GROUP_NAMES {
      opPrintMaybeRunCmd ...($name | split row ' ')
    }
  }
  opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_ADD_NAMES
}
