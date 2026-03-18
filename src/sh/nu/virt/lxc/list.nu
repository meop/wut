def virtLxcOp [cmd] {
  let instances = if 'VIRT_INSTANCES' in $env { $env.VIRT_INSTANCES } else { [] }
  let nameFilter = if ($instances | length) == 1 { [$instances.0] } else { [] }
  opPrintMaybeRunCmd sudo $"($cmd)-ls" --fancy --fancy-format '"NAME,IPV4,IPV6,STATE,AUTOSTART"' --running ...$nameFilter
}
