def --env packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --remove --nosave --recursive $env.PACK_REM_NAMES
  $env.PACKED = true
}
