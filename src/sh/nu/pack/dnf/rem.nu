def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd remove $env.PACK_REM_NAMES
  $env.PACKED = true
}
