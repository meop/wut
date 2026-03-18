def virtQemuOp [cmd] {
  let instances = if 'VIRT_INSTANCES' in $env { $env.VIRT_INSTANCES } else { [] }
  if ($instances | length) == 1 {
    let instance = $instances.0
    opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm.*($instance)"" '}'
    opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^qemu-system.*($instance)"" '}'
  } else {
    opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm"" '}'
    opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^qemu-system"" '}'
  }
}
