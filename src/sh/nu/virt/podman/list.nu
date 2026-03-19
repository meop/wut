def virtPodmanOp [cmd] {
  let kubeDir = '/etc/containers/systemd'
  for pod in (if ($kubeDir | path exists) {
    ls $kubeDir
      | where name =~ '\.kube$'
      | get name
      | each { |f| $f | path basename | str replace '.kube' '' }
      | if ($env.VIRT_INSTANCES | is-not-empty) { where { |p| $env.VIRT_INSTANCES | all { |f| $p | str contains $f } } } else { $in }
  } else { [] }) {
    opPrintMaybeRunCmd sudo systemctl status --no-pager --lines 0 $"($pod).service"
    opPrintMaybeRunCmd sudo $cmd pod list --filter $"name=($pod)" --format '"table {{.Name}}\t{{.Status}}\t{{.Created}}\t{{.NumberOfContainers}}"'
    opPrintMaybeRunCmd sudo $cmd container list --filter $"pod=($pod)" --format '"table {{.PodName}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.State}}\t{{.Status}}"'
  }
}
