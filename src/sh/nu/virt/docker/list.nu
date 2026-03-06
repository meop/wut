def virtDockerOp [cmd] {
  opPrintMaybeRunCmd sudo $cmd container ls --format '"table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.State}}\\t{{.Status}}"' --no-trunc
}
