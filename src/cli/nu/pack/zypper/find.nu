def packZypperOp [cmd] {
  opPrintMaybeRunCmd $cmd refresh '|' complete '|' ignore
  opPrintMaybeRunCmd $cmd search $env.PACK_FIND_NAMES
}
