def virtQemuOp [cmd, cmdSysArch] {
  for instance in $env.VIRT_INSTANCES {
    mut found = false
    if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^($cmdSysArch).*($instance)"" '}' '|' is-not-empty) == 'true' {
      opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full "^($cmdSysArch).*($instance)"'#"
      $found = true
    }
    if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm.*($instance)"" '}' '|' is-not-empty) == 'true' {
      opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full "^swtpm.*($instance)"'#"
    }
    if not $found {
      opPrintWarn $"`($cmd)` instance `($instance)` is already down"
    }
  }
}
