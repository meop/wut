def packDnfOp [cmd] {
  if 'PACK_ADD_GROUP_NAMES' in $env {
    $env.PACK_ADD_GROUP_NAMES | each {
      |pg| { opPrintMaybeRunCmd ...($pg | split words) }
    }
  }
  opPrintMaybeRunCmd $cmd check-update '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd install $env.PACK_ADD_NAMES
}
