def --env packCargoOp [cmd] {
  opPrintMaybeRunCmd $cmd uninstall $env.PACK_REM_NAMES
  $env.PACKED = true
}
