def --env packChocoOp [cmd] {
  for term in ($env.PACK_FIND_NAMES | split words) {
    opPrintMaybeRunCmd $cmd search $term
  }
}
