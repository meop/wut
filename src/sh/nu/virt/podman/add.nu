def splitYamlDocs [] {
  $in
    | str replace --regex '^---\n' ''
    | split row "\n---\n"
    | each { str trim }
    | where { is-not-empty }
    | each { from yaml }
}

def processYaml [yamlRaw, host, pod, instance] {
  mut result = []
  for doc in ($yamlRaw | str replace --all '{host}' $host | str replace --all '{pod}' $pod | str replace --all '{instance}' $instance | splitYamlDocs) {
    if ($doc | get kind? | default '') == 'Build' {
      # custom doc, not passed to podman
    } else {
      let doc = if ($doc | get apiVersion? | is-empty) { $doc | insert apiVersion 'v1' } else { $doc }
      $result = $result | append ($doc | to yaml)
    }
  }

  $result | str join "---\n"
}

def buildImage [yamlRaw, host, pod, instance] {
  let buildDocs = $yamlRaw
    | str replace --all '{host}' $host
    | str replace --all '{pod}' $pod
    | str replace --all '{instance}' $instance
    | splitYamlDocs
    | where { |d| ($d | get kind? | default '') == 'Build' }
  if ($buildDocs | is-empty) {
    return
  }

  for buildInfo in ($buildDocs | first | get images) {
    let image = $buildInfo.name
    let context = $buildInfo.buildContextPath
    let url = $"($env.REQ_URL_CFG)($buildInfo.filePath)"

    let containerfilePath = ($context | path join 'Containerfile')
    let containerfileContent = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"'

    opPrintMaybeRunCmd sudo mkdir -p $context
    opPrintMaybeRunCmd $"r#'($containerfileContent)'#" '|' sudo tee $containerfilePath '|' ignore

    if not (do --ignore-errors { ^sudo podman image exists $image }) {
      opPrintMaybeRunCmd sudo podman build --tag $image $context
    }
  }
}

def virtPodmanOp [cmd] {
  let kubeDir = '/etc/containers/systemd'

  let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/podman.yaml'#" ')"' | from yaml

  let pods = $env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq
  for pod in $pods {
    let yamlPath = $"($kubeDir)/($pod).yaml"
    let kubePath = $"($kubeDir)/($pod).kube"
    let podInstances = $env.VIRT_INSTANCES | where { |p| (($p | split row '/') | first) == $pod }

    if (do --ignore-errors { ^sudo systemctl is-active $"($pod).service" | str trim } | default '') == 'active' {
      opPrintWarn $"`($cmd)` pod `($pod)` is already up"
      continue
    }

    let configPod = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($pod).yaml'#" ')"'
      | str replace --all '{pod}' $pod
      | from yaml

    let hostname = $configPod | get spec.hostname? | default $pod
    let network = $configPod | get metadata.annotations.'io.podman.kube.network'? | default ''
    let mac = $configPod | get metadata.annotations.'io.podman.kube.podmanargs.mac-address'? | default ''

    let networkDef = $config | get podman.networks? | default {} | get --optional $network
    if $networkDef != null {
      if not (^sudo podman network ls --format '{{.Name}}' | lines | any { $in == $network }) {
        mut netArgs = ['network', 'create']
        if ($networkDef | get driver? | is-not-empty) { $netArgs = $netArgs | append ['--driver', $networkDef.driver] }
        if ($networkDef | get interface? | is-not-empty) { $netArgs = $netArgs | append ['--interface-name', $networkDef.interface] }
        if ($networkDef | get ipam? | is-not-empty) { $netArgs = $netArgs | append ['--ipam-driver', $networkDef.ipam] }
        for opt in ($networkDef | get options? | default {} | transpose key value) {
          $netArgs = $netArgs | append ['--opt', $"($opt.key)=($opt.value)"]
        }
        $netArgs = $netArgs | append $network
        opPrintMaybeRunCmd sudo podman ...$netArgs
      }
    }

    mut instanceDocs = []
    for instancePath in $podInstances {
      let instance = ($instancePath | split row '/') | last
      let yamlRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($instancePath).yaml'#" ')"'

      buildImage $yamlRaw $env.SYS_HOST $pod $instance

      $instanceDocs = $instanceDocs | append [(processYaml $yamlRaw $env.SYS_HOST $pod $instance | splitYamlDocs)]
    }

    mut containers = []
    mut volumes = []
    mut configMaps = []
    mut annotations = $configPod | get metadata.annotations? | default {}

    for docs in $instanceDocs {
      let podDoc = $docs | where { |d| ($d | get kind? | default '') == 'Pod' } | first

      let newContainers = $podDoc | get spec.containers
      let newNames = $newContainers | each { |c| $c.name }
      $containers = ($containers | where { |c| not ($newNames | any { |n| $n == $c.name }) }) | append $newContainers

      let newVolumes = $podDoc | get spec.volumes? | default []
      let newVolNames = $newVolumes | each { |v| $v.name }
      $volumes = ($volumes | where { |v| not ($newVolNames | any { |n| $n == $v.name }) }) | append $newVolumes

      let newConfigMaps = $docs | where { |d| ($d | get kind? | default '') == 'ConfigMap' }
      for cm in $newConfigMaps {
        $configMaps = ($configMaps | where { |m| $m.metadata.name != $cm.metadata.name }) | append $cm
      }

      $annotations = $annotations | merge ($podDoc | get metadata.annotations? | default {})
    }

    for container in $containers {
      opPrintMaybeRunCmd sudo $cmd pull $container.image
    }

    let allDocs = ([{
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: $pod, annotations: $annotations },
      spec: { hostname: $hostname, containers: $containers, volumes: $volumes },
    } | to yaml] | append ($configMaps | each { to yaml })) | str join "---\n"

    mut kubeLines = ['[Unit]', $"Description=($pod) pod", '', '[Kube]', $"Yaml=($pod).yaml", $"Network=($network)"]
    if ($mac | is-not-empty) {
      $kubeLines = $kubeLines | append $"PodmanArgs=--mac-address ($mac)"
    }

    let isNew = not ($kubePath | path exists)
    opPrintMaybeRunCmd sudo mkdir -p $kubeDir
    opPrintMaybeRunCmd $"r#'($allDocs)'#" '|' sudo tee $yamlPath '|' ignore
    opPrintMaybeRunCmd $"r#'(($kubeLines | append ['', '[Install]', 'WantedBy=default.target'] | str join "\n") + "\n")'#" '|' sudo tee $kubePath '|' ignore
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    if $isNew {
      opPrintMaybeRunCmd sudo systemctl start $"($pod).service"
    } else {
      opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
    }
  }
}
