def --env packBrewOp [cmd] {
  opPrintMaybeRunCmd $cmd uninstall $env.PACK_REM_NAMES
  $env.PACKED = true
  for name in ($env.PACK_REM_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
}
