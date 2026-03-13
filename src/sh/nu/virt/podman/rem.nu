def buildAnnotations [hostname, containers] {
  $containers | reduce --fold {} { |c, acc|
    $acc
      | upsert $"io.podman.annotations.uts/($c.name)" "private"
      | upsert $"io.podman.annotations.hostname/($c.name)" $"($hostname)-($c.name)"
  }
}

def virtPodmanOp [cmd] {
  for instancePath in $env.VIRT_INSTANCES {
    let parts = $instancePath | split row '/'
    let pod = $parts | first

    if ($parts | length) == 1 {
      let kubeDir = '/etc/containers/systemd'
      opPrintMaybeRunCmd sudo systemctl disable --now $"($pod).service"
      opPrintMaybeRunCmd sudo rm -f $"($kubeDir)/($pod).yaml" $"($kubeDir)/($pod).kube"
      opPrintMaybeRunCmd sudo systemctl daemon-reload
    } else {
      let instance = $parts | last

      let kubeDir = '/etc/containers/systemd'
      let yamlPath = $"($kubeDir)/($pod).yaml"
      let kubePath = $"($kubeDir)/($pod).kube"

      if ($yamlPath | path exists) {
        let existing = open $yamlPath
        let remaining = $existing.spec.containers | where { |c| $c.name != $instance }

        if ($remaining | is-empty) {
          opPrintMaybeRunCmd sudo systemctl disable --now $"($pod).service"
          opPrintMaybeRunCmd sudo rm -f $yamlPath $kubePath
          opPrintMaybeRunCmd sudo systemctl daemon-reload
        } else {
          let hostname = $existing.spec.hostname? | default $pod
          let combinedYaml = $existing
            | update spec.containers $remaining
            | upsert metadata.annotations (buildAnnotations $hostname $remaining)
            | to yaml
          opPrintMaybeRunCmd $"r#'($combinedYaml)'#" '|' sudo tee $yamlPath '|' ignore
          opPrintMaybeRunCmd sudo systemctl daemon-reload
          opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
        }
      }
    }
  }
}
