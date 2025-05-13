def packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --remove --recursive --nosave $env.PACK_REM_NAMES
  if 'PACK_REM_GROUP_NAMES' in $env {
    $env.PACK_REM_GROUP_NAMES | each {
      |pg| { opPrintMaybeRunCmd ...($pg | split words) }
    }
  }
}
