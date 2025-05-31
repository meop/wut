def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}'
  }
}
