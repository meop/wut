def virtLxcOpRem [cmd, instance] {
  if (do --ignore-errors { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } }) {
    opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
  }

  if ($"/var/lib/lxc/($instance)" | path exists) {
    opPrintMaybeRunCmd sudo rm -rf $"/var/lib/lxc/($instance)"
  } else {
    opPrintWarn $"`($cmd)` instance `($instance)` not found"
  }
}

def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    virtLxcOpRem $cmd $instance
  }
}
