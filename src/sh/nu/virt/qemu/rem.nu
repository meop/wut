def virtQemuOpRem [cmd, instance] {
  let serviceName = $"qemu-($instance)"
  let serviceDirPath = '/etc/systemd/system'
  let serviceFilePath = ($serviceDirPath | path join $"($serviceName).service")
  let configDirPath = $"/var/lib/qemu/($instance)"

  let cleanedService = $serviceFilePath | path exists
  if $cleanedService {
    opPrintMaybeRunCmd sudo systemctl disable --now $serviceName
    opPrintMaybeRunCmd sudo rm -f $serviceFilePath
    opPrintMaybeRunCmd sudo systemctl daemon-reload
  }

  let cleanedConfig = $configDirPath | path exists
  if $cleanedConfig {
    opPrintMaybeRunCmd sudo rm -rf $configDirPath
  }

  if not ($cleanedService or $cleanedConfig) {
    opPrintWarn $"`($cmd)` instance `($instance)` is already removed"
  }
}

def virtQemuOp [cmd] {
  let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
    $env.VIRT_INSTANCES
  } else {
    let serviceDirPath = '/etc/systemd/system'
    if ($serviceDirPath | path exists) {
      ls $serviceDirPath
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
