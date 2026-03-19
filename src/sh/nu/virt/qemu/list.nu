def virtQemuOp [cmd] {
  let serviceDir = '/etc/systemd/system'
  for instance in (if ($serviceDir | path exists) {
    ls $serviceDir
      | where name =~ '/qemu-[^/]+\.service$'
      | get name
      | each { |f| $f | path basename | str replace 'qemu-' '' | str replace '.service' '' }
      | if ($env.VIRT_INSTANCES | is-not-empty) { where { |i| $env.VIRT_INSTANCES | all { |f| $i | str contains $f } } } else { $in }
  } else { [] }) {
    try { opPrintMaybeRunCmd sudo systemctl status --no-pager --lines 0 $"qemu-($instance).service" }
    try { opPrintMaybeRunCmd pgrep --ignore-ancestors --full --list-full $"^swtpm.*($instance)" }
    try { opPrintMaybeRunCmd pgrep --ignore-ancestors --full --list-full $"^qemu-system.*($instance)" }
  }
}
