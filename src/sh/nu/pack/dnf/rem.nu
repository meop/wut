def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd remove $env.PACK_REM_NAMES
  $env.PACKED = true
  if 'PACK_REM_GROUP_NAMES' in $env {
    for name in $env.PACK_REM_GROUP_NAMES {
      opPrintMaybeRunCmd ...($name | split row ' ')
    }
  }
}
