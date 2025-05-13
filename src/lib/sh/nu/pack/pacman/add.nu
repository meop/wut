def packPacmanOp [cmd] {
  if 'PACK_ADD_GROUP_NAMES' in $env {
    $env.PACK_ADD_GROUP_NAMES | each {
      |pg| { opPrintMaybeRunCmd ...($pg | split words) }
    }
  }
  opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_ADD_NAMES
}
