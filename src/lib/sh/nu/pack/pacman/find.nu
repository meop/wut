def packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --refresh '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd --sync --search $env.PACK_FIND_NAMES
}
