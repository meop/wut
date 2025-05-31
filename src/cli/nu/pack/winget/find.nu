def packWingetOp [cmd] {
  opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
}
