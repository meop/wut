def --env packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd purge --autoremove $env.PACK_REM_NAMES
  $env.PACKED = true
}
