def --env packApkOp [cmd] {
  opPrintMaybeRunCmd $cmd del $env.PACK_REM_NAMES
  $env.PACKED = true
}
