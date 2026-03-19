def --env packAptOp [cmd] {
  for name in ($env.PACK_ADD_GROUP_NAMES? | default []) {
    opPrintMaybeRunCmd ...($name | split row ' ')
  }
  opPrintMaybeRunCmd $cmd install $env.PACK_ADD_NAMES
  $env.PACKED = true
}
