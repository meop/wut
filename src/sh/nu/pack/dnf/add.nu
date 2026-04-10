def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd install $env.PACK_ADD_NAMES
  $env.PACKED = true
}
