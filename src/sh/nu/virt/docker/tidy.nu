def virtDockerOp [cmd] {
  opPrintMaybeRunCmd sudo $cmd system prune --all --volumes
}
