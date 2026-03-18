def virtPodmanOp [cmd] {
  opPrintMaybeRunCmd sudo $cmd system prune --all
}
