def packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --search $env.PACK_FIND_NAMES
}
