def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}' '|' is-not-empty) == 'true' {
      opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full ($cmd).*($instance)'#"
      continue
    }
    opPrintWarn $"`($cmd)` instance `($instance)` is already down"
  }
}
