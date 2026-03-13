def virtPodmanOp [cmd] {
  let pods = $env.VIRT_INSTANCES
    | each { |p| ($p | split row '/') | first }
    | uniq

  for pod in $pods {
    let yamlPath = $"/etc/containers/systemd/($pod).yaml"
    let kubePath = $"/etc/containers/systemd/($pod).kube"

    if ($kubePath | path exists) {
      let existing = open $yamlPath
      for container in $existing.spec.containers {
        opPrintMaybeRunCmd sudo $cmd pull $container.image
      }
      opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
    }
  }
}
