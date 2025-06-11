def virtQemuOp [cmd] {
  opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd)" '}'
}
