def --env packZypperOp [cmd] {
  opPrintMaybeRunCmd $cmd remove --clean-deps $env.PACK_REM_NAMES
  $env.PACKED = true
  for name in ($env.PACK_REM_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
}
