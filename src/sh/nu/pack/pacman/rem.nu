def --env packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --remove --nosave --recursive $env.PACK_REM_NAMES
  $env.PACKED = true
  for name in ($env.PACK_REM_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
}
