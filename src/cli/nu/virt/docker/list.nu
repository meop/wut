def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    opPrintMaybeRunCmd $cmd container ls '|' find --ignore-case $instance
  }
}
