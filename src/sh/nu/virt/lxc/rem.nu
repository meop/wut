def virtLxcOpRem [cmd, instance] {
  if (try { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } } catch { false }) {
    opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
  }

  if ($"/var/lib/lxc/($instance)" | path exists) {
    opPrintMaybeRunCmd sudo rm -rf $"/var/lib/lxc/($instance)"
  } else {
    opPrintWarn $"`($cmd)` instance `($instance)` not found"
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
