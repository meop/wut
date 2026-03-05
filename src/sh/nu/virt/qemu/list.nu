def virtQemuOp [cmd, cmdSysArch] {
  opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm"" '}'
  opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^($cmdSysArch)"" '}'
}
