def virtPodmanOp [cmd] {
  opPrintMaybeRunCmd sudo $cmd system prune --force
}
