def virtLxcOpRem [cmd, instance] {
  let wasRunning = ^sudo $"($cmd)-ls" --running | complete | get stdout | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance }
  if $wasRunning {
    opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
  }

  let hasConfig = $"/var/lib/lxc/($instance)" | path exists
  if $hasConfig {
    opPrintMaybeRunCmd sudo rm -rf $"/var/lib/lxc/($instance)"
  }

  if not ($wasRunning or $hasConfig) {
    opPrintWarn $"`($cmd)` instance `($instance)` is already removed"
  }
}

def virtLxcOp [cmd] {
  let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
    $env.VIRT_INSTANCES
  } else {
    let lxcDir = '/var/lib/lxc'
    if ($lxcDir | path exists) {
      ls $lxcDir | where type == dir | get name | each { |f| $f | path basename }
    } else {
      []
    }
  }
  for instance in $instances {
    virtLxcOpRem $cmd $instance
  }
}
