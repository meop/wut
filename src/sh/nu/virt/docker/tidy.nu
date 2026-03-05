def virtDockerOp [cmd] {
  opPrintMaybeRunCmd $cmd system prune --all --volumes
}
