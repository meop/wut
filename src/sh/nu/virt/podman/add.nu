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

def buildImage [yamlRaw, host, pod, instance, alreadyBuilt: list<string>] {
  let buildDocs = $yamlRaw
    | str replace --all '{host}' $host
    | str replace --all '{pod}' $pod
    | str replace --all '{instance}' $instance
    | splitYamlDocs
    | where { |d| ($d | get kind? | default '') == 'Build' }
  if ($buildDocs | is-empty) {
    return $alreadyBuilt
  }

  mut built = $alreadyBuilt
  for buildInfo in ($buildDocs | first | get images) {
    let image = $buildInfo.name
    if $image in $built { continue }

    let contextDirPath = $buildInfo.buildContextPath
    let containerfileUrl = $"($env.REQ_URL_CFG)($buildInfo.filePath)"

    let containerfileFilePath = ($contextDirPath | path join ($buildInfo.filePath | path basename))
    let containerfileContent = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($containerfileUrl)'#" ')"'

    opPrintMaybeRunCmd sudo mkdir -p $contextDirPath
    opPrintMaybeRunCmd $"r#'($containerfileContent)'#" '|' sudo tee $containerfileFilePath '|' ignore
    opPrintMaybeRunCmd sudo podman build --file $containerfileFilePath --tag $image $contextDirPath

    $built = $built | append $image
  }
  $built
}

def upsertByName [existing, incoming] {
  let incomingNames = $incoming | each { |x| $x.name }
  ($existing | where { |x| not ($incomingNames | any { |n| $n == $x.name }) }) | append $incoming
}

def virtPodmanOp [cmd] {
  let kubeDirPath = '/etc/containers/systemd'
  let networks = $env.VIRT_PODMAN_NETWORKS | from json

  let pods = $env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq
  for pod in $pods {
    let yamlFilePath = $"($kubeDirPath)/($pod).yaml"
    let kubeFilePath = $"($kubeDirPath)/($pod).kube"
    let podInstances = $env.VIRT_INSTANCES | where { |p| (($p | split row '/') | first) == $pod }

    if (^sudo systemctl is-active $"($pod).service" | complete | get stdout | str trim) == 'active' {
      opPrintWarn $"`($cmd)` pod `($pod)` is already added"
      continue
    }

    # layer 2: pod.yaml — base pod metadata (hostname, network, mac, annotations)
    let configPodRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($pod).yaml'#" ')"'
    mut builtImages = buildImage $configPodRaw $env.SYS_HOST $pod '' []
    mut podDoc = $configPodRaw
      | str replace --all '{host}' $env.SYS_HOST
      | str replace --all '{pod}' $pod
      | splitYamlDocs
      | where { |d| ($d | get kind? | default '') == 'Pod' }
      | first

    mut configMaps = []

    # layer 3: instance yamls — overlaid onto pod base
    for instancePath in $podInstances {
      let instance = ($instancePath | split row '/') | last
      let yamlRaw = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($instancePath).yaml'#" ')"'

      $builtImages = buildImage $yamlRaw $env.SYS_HOST $pod $instance $builtImages

      let instanceDocs = processYaml $yamlRaw $env.SYS_HOST $pod $instance | splitYamlDocs
      let instancePodDoc = $instanceDocs | where { |d| ($d | get kind? | default '') == 'Pod' } | first

      $podDoc = $podDoc
        | upsert metadata.annotations (deepMerge ($podDoc | get metadata.annotations? | default {}) ($instancePodDoc | get metadata.annotations? | default {}))
        | upsert spec.containers (upsertByName ($podDoc | get spec.containers? | default []) ($instancePodDoc | get spec.containers? | default []))
        | upsert spec.volumes (upsertByName ($podDoc | get spec.volumes? | default []) ($instancePodDoc | get spec.volumes? | default []))

      let instanceHostname = $instancePodDoc | get spec.hostname?
      if $instanceHostname != null {
        $podDoc = $podDoc | upsert spec.hostname $instanceHostname
      }

      for cm in ($instanceDocs | where { |d| ($d | get kind? | default '') == 'ConfigMap' }) {
        $configMaps = ($configMaps | where { |m| $m.metadata.name != $cm.metadata.name }) | append $cm
      }
    }

    let annotations = $podDoc | get metadata.annotations? | default {}
    let network = $annotations | get 'io.podman.kube.network'? | default ''
    let mac = $annotations | get 'io.podman.kube.podmanargs.mac-address'? | default ''
    let containers = $podDoc | get spec.containers? | default []
    let volumes = $podDoc | get spec.volumes? | default []
    let hostname = $podDoc | get spec.hostname? | default $pod

    let networkDef = $networks | get --optional $network
    if $networkDef != null {
      if not (^sudo podman network ls --format '{{.Name}}' | lines | any { $in == $network }) {
        let netArgs = [
          ['network', 'create'],
          (if ($networkDef | get driver? | is-not-empty) { ['--driver', $networkDef.driver] } else { [] }),
          (if ($networkDef | get interface? | is-not-empty) { ['--interface-name', $networkDef.interface] } else { [] }),
          (if ($networkDef | get ipam? | is-not-empty) { ['--ipam-driver', $networkDef.ipam] } else { [] }),
          ($networkDef | get options? | default {} | transpose key value | each { |opt| ['--opt', $"($opt.key)=($opt.value)"] } | flatten),
          [$network],
        ] | flatten
        opPrintMaybeRunCmd sudo podman ...$netArgs
      }
    }

    for container in $containers {
      if not ($container.image | str starts-with 'localhost/') {
        opPrintMaybeRunCmd sudo $cmd pull $container.image
      }
    }

    let allDocs = ([({
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: $pod, annotations: $annotations },
      spec: { hostname: $hostname, containers: $containers, volumes: $volumes },
    } | to yaml)] | append ($configMaps | each { |cm| $cm | to yaml })) | str join "---\n"

    let kubeLines = [
      ['[Unit]', $"Description=($pod) pod", '', '[Kube]', $"Yaml=($pod).yaml", $"Network=($network)"],
      (if ($mac | is-not-empty) { [$"PodmanArgs=--mac-address ($mac)"] } else { [] }),
    ] | flatten

    let isNew = not ($kubeFilePath | path exists)
    opPrintMaybeRunCmd sudo mkdir -p $kubeDirPath
    opPrintMaybeRunCmd $"r#'($allDocs)'#" '|' sudo tee $yamlFilePath '|' ignore
    opPrintMaybeRunCmd $"r#'(($kubeLines | append ['', '[Install]', 'WantedBy=default.target'] | str join "\n") + "\n")'#" '|' sudo tee $kubeFilePath '|' ignore
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    if $isNew {
      opPrintMaybeRunCmd sudo systemctl start $"($pod).service"
    } else {
      opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
    }
  }
}
