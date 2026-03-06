def virtLxcOp [cmd] {
  opPrintMaybeRunCmd sudo $"($cmd)-ls" --fancy --fancy-format '"NAME,IPV4,IPV6,STATE,AUTOSTART"' --running
}
