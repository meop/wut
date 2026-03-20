def virtQemuOpRem [cmd, instance] {
  let serviceName = $"qemu-($instance)"
  let serviceDir = '/etc/systemd/system'
  let servicePath = ($serviceDir | path join $"($serviceName).service")
  let configDir = $"/var/lib/qemu/($instance)"

  let cleanedService = $servicePath | path exists
  if $cleanedService {
    opPrintMaybeRunCmd sudo systemctl disable --now $serviceName
    opPrintMaybeRunCmd sudo rm -f $servicePath
    opPrintMaybeRunCmd sudo systemctl daemon-reload
  }

  let cleanedConfig = $configDir | path exists
  if $cleanedConfig {
    opPrintMaybeRunCmd sudo rm -rf $configDir
  }

  if not ($cleanedService or $cleanedConfig) {
    opPrintWarn $"`($cmd)` instance `($instance)` is already removed"
  }
}

def virtQemuOp [cmd] {
  let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
    $env.VIRT_INSTANCES
  } else {
    let serviceDir = '/etc/systemd/system'
    if ($serviceDir | path exists) {
      ls $serviceDir
        | where name =~ '/qemu-[^/]+\.service$'
        | get name
        | each { |f| $f | path basename | str replace 'qemu-' '' | str replace '.service' '' }
    } else {
      []
    }
  }
  for instance in $instances {
    virtQemuOpRem $cmd $instance
  }
}
