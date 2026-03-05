def packScoopOp [cmd] {
  opPrintMaybeRunCmd $cmd uninstall $env.PACK_REM_NAMES
  if 'PACK_REM_GROUP_NAMES' in $env {
    for name in $env.PACK_REM_GROUP_NAMES {
      opPrintMaybeRunCmd ...($name | split row ' ')
    }
  }
}
