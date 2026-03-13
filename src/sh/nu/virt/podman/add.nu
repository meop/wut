def processYaml [yamlRaw, host, pod, instance] {
  let yamlParsed = $yamlRaw
    | str replace --all '{host}' $host
    | str replace --all '{pod}' $pod
    | str replace --all '{instance}' $instance
    | from yaml

  let hostname = ($yamlParsed | get spec.hostname? | default $instance)
  mut annotations = ($yamlParsed | get metadata.annotations? | default {})

  for container in ($yamlParsed | get spec.containers) {
    let cName = $container.name
    $annotations = ($annotations | upsert $"io.podman.annotations.uts/($cName)" "private")
    $annotations = ($annotations | upsert $"io.podman.annotations.hostname/($cName)" $"($hostname)-($cName)")
  }

  $yamlParsed | upsert metadata.annotations $annotations | to yaml
}

def buildAnnotations [hostname, containers] {
  $containers | reduce --fold {} { |c, acc|
    $acc
      | upsert $"io.podman.annotations.uts/($c.name)" "private"
      | upsert $"io.podman.annotations.hostname/($c.name)" $"($hostname)-($c.name)"
  }
}

def virtPodmanOp [cmd] {
  let kubeDir = '/etc/containers/systemd'

  let singleFile = $env.VIRT_INSTANCES | where { |p| not ($p | str contains '/') }
  for pod in $singleFile {
    let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($pod).yaml"
    let yamlRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"'
    let yaml = processYaml $yamlRaw $env.SYS_HOST $pod $pod

    let yamlPath = $"($kubeDir)/($pod).yaml"
    opPrintMaybeRunCmd $"r#'($yaml)'#" '|' sudo tee $yamlPath '|' ignore

    let kubePath = $"($kubeDir)/($pod).kube"
    let kubeContent = ([
      '[Unit]',
      $"Description=($pod) pod",
      '',
      '[Kube]',
      $"Yaml=($pod).yaml",
      '',
      '[Install]',
      'WantedBy=default.target',
    ] | str join "\n") + "\n"
    opPrintMaybeRunCmd $"r#'($kubeContent)'#" '|' sudo tee $kubePath '|' ignore

    opPrintMaybeRunCmd sudo systemctl daemon-reload
    opPrintMaybeRunCmd sudo systemctl enable --now $"($pod).service"
  }

  let multiFile = $env.VIRT_INSTANCES | where { |p| $p | str contains '/' }
  let pods = $multiFile | each { |p| ($p | split row '/') | first } | uniq
  for pod in $pods {
    let yamlPath = $"($kubeDir)/($pod).yaml"
    let kubePath = $"($kubeDir)/($pod).kube"
    let podInstances = $multiFile | where { |p| (($p | split row '/') | first) == $pod }

    let baseParsed = if ($yamlPath | path exists) {
      open $yamlPath
    } else {
      let firstInstance = $podInstances | first
      let firstUrl = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($firstInstance).yaml"
      let firstRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($firstUrl)'#" ')"'
      processYaml $firstRaw $env.SYS_HOST $pod ($firstInstance | split row '/' | last) | from yaml | update spec.containers []
    }

    let hostname = $baseParsed.spec.hostname? | default $pod
    mut containers = $baseParsed.spec.containers

    for instancePath in $podInstances {
      let instance = ($instancePath | split row '/') | last
      let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($instancePath).yaml"
      let yamlRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"'
      let newContainer = processYaml $yamlRaw $env.SYS_HOST $pod $instance | from yaml | get spec.containers | first
      $containers = ($containers | where { |c| $c.name != $instance }) | append $newContainer
    }

    let combinedYaml = $baseParsed
      | update spec.containers $containers
      | upsert metadata.annotations (buildAnnotations $hostname $containers)
      | to yaml

    let isNew = not ($kubePath | path exists)
    opPrintMaybeRunCmd $"r#'($combinedYaml)'#" '|' sudo tee $yamlPath '|' ignore
    if $isNew {
      let kubeContent = ([
        '[Unit]',
        $"Description=($pod) pod",
        '',
        '[Kube]',
        $"Yaml=($pod).yaml",
        '',
        '[Install]',
        'WantedBy=default.target',
      ] | str join "\n") + "\n"
      opPrintMaybeRunCmd $"r#'($kubeContent)'#" '|' sudo tee $kubePath '|' ignore
    }
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    if $isNew {
      opPrintMaybeRunCmd sudo systemctl enable --now $"($pod).service"
    } else {
      opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
    }
  }
}
