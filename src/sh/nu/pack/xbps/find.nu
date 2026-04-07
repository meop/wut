def --env packXbpsOp [cmd] {
  for term in ($env.PACK_FIND_NAMES | split words) {
    opPrintMaybeRunCmd $"($cmd)-query" --repository --search $term
  }
}
