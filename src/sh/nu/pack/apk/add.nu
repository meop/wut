def --env packApkOp [cmd] {
  opPrintMaybeRunCmd $cmd add $env.PACK_ADD_NAMES
  $env.PACKED = true
}
