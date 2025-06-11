def virtDockerOp [cmd] {
  opPrintMaybeRunCmd $cmd container ls
}
