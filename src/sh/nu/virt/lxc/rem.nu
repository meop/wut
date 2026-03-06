def virtLxcOpRem [cmd, instance] {
  if (do --ignore-errors { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } }) {
    opPrintMaybeRunCmd sudo $"($cmd)-stop" -n $instance
  } else {
    opPrintWarn $"`($cmd)` instance `($instance)` is already down"
  }
}

def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    virtLxcOpRem $cmd $instance
  }
}
