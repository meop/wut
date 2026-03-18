def virtPodmanOp [cmd] {
  let pods = if 'VIRT_INSTANCES' in $env {
    $env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq
  } else {
    []
  }

  let podFilters = if ($pods | length) == 1 {
    ['--filter', $"name=($pods | first)"]
  } else {
    []
  }
  let containerFilters = if ($pods | length) == 1 {
    ['--filter', $"pod=($pods | first)"]
  } else {
    []
  }

  opPrintMaybeRunCmd sudo $cmd pod list ...$podFilters --format '"table {{.Name}}\t{{.Status}}\t{{.Created}}\t{{.NumberOfContainers}}"'
  opPrintMaybeRunCmd sudo $cmd container list ...$containerFilters --format '"table {{.PodName}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.State}}\t{{.Status}}"'
}
