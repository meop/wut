def virtDockerOp [cmd] {
  let filters = if ($env.VIRT_INSTANCES | is-not-empty) { $env.VIRT_INSTANCES } else { [] }
  let allInstances = do --ignore-errors { ^sudo $cmd compose ls --format json | from json | get Name } | default []
  let instances = if ($filters | is-not-empty) {
    $allInstances | where { |i| $filters | all { |f| $i | str contains $f } }
  } else {
    $allInstances
  }
  let nameFilters = $instances | each { |i| ['--filter', $"name=($i)"] } | flatten
  opPrintMaybeRunCmd sudo $cmd container ls --all --format '"table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.State}}\\t{{.Status}}"' --no-trunc ...$nameFilters
}
