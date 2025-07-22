def packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd check-upgrade '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
}
