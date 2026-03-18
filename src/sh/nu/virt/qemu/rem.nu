def virtQemuOpRem [cmd, instance] {
  let serviceName = $"qemu-($instance)"
  let serviceDir = '/etc/systemd/system'
  let servicePath = ($serviceDir | path join $"($serviceName).service")
  let configDir = $"/var/lib/qemu/($instance)"

  mut found = false
  if ($servicePath | path exists) {
    opPrintMaybeRunCmd sudo systemctl disable --now $serviceName
    opPrintMaybeRunCmd sudo rm -f $servicePath
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    $found = true
  }

  if ($configDir | path exists) {
    opPrintMaybeRunCmd sudo rm -rf $configDir
  }

  if not $found {
    opPrintWarn $"`($cmd)` instance `($instance)` is already down"
  }
}

def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    virtQemuOpRem $cmd $instance
  }
}
