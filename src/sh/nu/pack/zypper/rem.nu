def --env packZypperOp [cmd] {
  opPrintMaybeRunCmd $cmd remove --clean-deps $env.PACK_REM_NAMES
  $env.PACKED = true
}
