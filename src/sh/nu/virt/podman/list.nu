def virtPodmanOp [cmd] {
  opPrintMaybeRunCmd sudo $cmd pod list --format '"table {{.Name}}\t{{.Status}}\t{{.Created}}\t{{.Containers}}"'
  opPrintMaybeRunCmd sudo $cmd container list --format '"table {{.Names}}\t{{.Image}}\t{{.IPAddress}}\t{{.Ports}}\t{{.State}}\t{{.Status}}\t{{.PodName}}"'
}
