def virtLxcOp [cmd] {
  let filters = if ($env.VIRT_INSTANCES | is-not-empty) { $env.VIRT_INSTANCES } else { [] }
  let allInstances = ^sudo $"($cmd)-ls" | complete | get stdout | split row ' ' | str trim | where { is-not-empty }
  let instances = if ($filters | is-not-empty) {
    $allInstances | where { |i| $filters | all { |f| $i | str contains $f } }
  } else {
    $allInstances
  }
  for instance in $instances {
    opPrintMaybeRunCmd sudo $"($cmd)-ls" --fancy --fancy-format '"NAME,IPV4,IPV6,STATE,AUTOSTART"' -- $instance
  }
}
