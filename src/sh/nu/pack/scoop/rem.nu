def --env packScoopOp [cmd] {
  opPrintMaybeRunCmd $cmd uninstall --purge $env.PACK_REM_NAMES
  $env.PACKED = true
}
