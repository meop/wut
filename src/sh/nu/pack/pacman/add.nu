def --env packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --needed $env.PACK_ADD_NAMES
  $env.PACKED = true
}
