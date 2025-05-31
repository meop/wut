def packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd check-update '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
}
