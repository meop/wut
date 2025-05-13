def packAptOp [cmd] {
  opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
}
