def --env packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd purge --autoremove $env.PACK_REM_NAMES
  $env.PACKED = true
  for name in ($env.PACK_REM_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
}
