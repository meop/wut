def virtPodman [] {
  let cmd = 'podman'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $cmd | is-empty) {
    return
  }

  def splitYamlDocs [] {
    $in
      | str replace --regex '^---\n' ''
      | split row "\n---\n"
      | each { str trim }
      | where { is-not-empty }
      | each { from yaml }
  }

  # {host}, {pod} and {instance}, and each name podman.yaml's environment gives, as {name}
  def fillVars [text: string, host: string, pod: string, instance?: string] {
    let named = ($env.VIRT_PODMAN_ENV? | default '{}' | from json | upsert host $host | upsert pod $pod)
    let named = if $instance == null { $named } else { $named | upsert instance $instance }
    $named | transpose key value | reduce --fold $text { |kv, acc| $acc | str replace --all $"{($kv.key)}" $kv.value }
  }

  def processYaml [yamlRaw, host, pod, instance] {
    mut result = []
    for doc in (fillVars $yamlRaw $host $pod $instance | splitYamlDocs) {
      if ($doc | get kind? | default '') == Build {
        # custom doc, not passed to podman
      } else {
        let doc = if ($doc | get apiVersion? | is-empty) { $doc | insert apiVersion 'v1' } else { $doc }
        $result = $result | append ($doc | to yaml)
      }
    }

    $result | str join "---\n"
  }

  def buildImage [yamlRaw, host, pod, instance, alreadyBuilt: list<string>] {
    let buildDocs = fillVars $yamlRaw $host $pod $instance
      | splitYamlDocs
      | where { |d| ($d | get kind? | default '') == Build }
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
      let containerfileContent = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($containerfileUrl)'#"

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

  def readKubeNetwork [kubeFilePath: string] {
    if not ($kubeFilePath | path exists) { return '' }
    let networkLines = open --raw $kubeFilePath | lines | where { $in | str starts-with 'Network=' }
    if ($networkLines | is-empty) { return '' }
    $networkLines | first | str replace 'Network=' '' | str trim
  }

  def removeNetworkIfUnused [network: string, pod: string, managedNetworks: record] {
    if ($network | is-empty) { return }
    if ($managedNetworks | get --optional $network) == null { return }
    let kubeDirPath = '/etc/containers/systemd'
    if not ($kubeDirPath | path exists) {
      opPrintMaybeRunCmd sudo podman network rm $network
      return
    }
    if not (ls $kubeDirPath
      | where name =~ '\.kube$'
      | where { |f| not ($f.name | str ends-with $"($pod).kube") }
      | each { |f| open --raw $f.name }
      | str join "\n"
      | str contains $"Network=($network)") {
      opPrintMaybeRunCmd sudo podman network rm $network
    }
  }

  # a quadlet unit cannot be systemctl enabled: an [Install] drop-in is what starts it at boot
  def installFilePath [pod] {
    $"/etc/containers/systemd/($pod).kube.d/install.conf"
  }

  def podState [pod] {
    let kubeFilePath = $"/etc/containers/systemd/($pod).kube"
    if not ($kubeFilePath | path exists) {
      return null
    }
    {
      # a .kube written before the drop-in carried its own [Install]
      enabled: ((installFilePath $pod | path exists) or (open --raw $kubeFilePath | str contains '[Install]')),
      active: ((^systemctl is-active $"($pod).service" | complete | get stdout | str trim) == 'active'),
    }
  }

  def podInstall [pod, on: bool] {
    let filePath = installFilePath $pod
    if $on {
      opPrintMaybeRunCmd sudo mkdir -p ($filePath | path dirname)
      opPrintMaybeRunCmd $"r#'[Install]\nWantedBy=default.target\n'#" '|' sudo tee $filePath '|' ignore
    } else if ($filePath | path exists) {
      opPrintMaybeRunCmd sudo rm -rf ($filePath | path dirname)
    }
  }

  # state: podState from before a sync stopped the pod, or null for a pod new to this host
  def doAdd [pod, podInstances, cmd, state] {
    let kubeDirPath = '/etc/containers/systemd'
    let networks = $env.VIRT_PODMAN_NETWORKS | from json
    let yamlFilePath = $"($kubeDirPath)/($pod).yaml"
    let kubeFilePath = $"($kubeDirPath)/($pod).kube"

    # layer 2: pod.yaml — base pod metadata (hostname, network, mac, annotations)
    let configPodRaw = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($pod).yaml'#"
    mut builtImages = buildImage $configPodRaw $env.SYS_HOST $pod '' []
    mut podDoc = fillVars $configPodRaw $env.SYS_HOST $pod
      | splitYamlDocs
      | where { |d| ($d | get kind? | default '') == Pod }
      | first

    mut configMaps = []

    # layer 3: instance yamls — overlaid onto pod base
    for instancePath in $podInstances {
      let instance = ($instancePath | split row '/') | last
      let yamlRaw = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/podman/($instancePath).yaml'#"

      $builtImages = buildImage $yamlRaw $env.SYS_HOST $pod $instance $builtImages

      let instanceDocs = processYaml $yamlRaw $env.SYS_HOST $pod $instance | splitYamlDocs
      let instancePodDoc = $instanceDocs | where { |d| ($d | get kind? | default '') == Pod } | first

      $podDoc = $podDoc
        | upsert metadata.annotations (virtDeepMerge ($podDoc | get metadata.annotations? | default {}) ($instancePodDoc | get metadata.annotations? | default {}))
        | upsert spec.containers (upsertByName ($podDoc | get spec.containers? | default []) ($instancePodDoc | get spec.containers? | default []))
        | upsert spec.volumes (upsertByName ($podDoc | get spec.volumes? | default []) ($instancePodDoc | get spec.volumes? | default []))

      let instanceHostname = $instancePodDoc | get spec.hostname?
      if $instanceHostname != null {
        $podDoc = $podDoc | upsert spec.hostname $instanceHostname
      }

      for cm in ($instanceDocs | where { |d| ($d | get kind? | default '') == ConfigMap }) {
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

    # the pod's own data folder, made when missing: on btrfs a subvolume, so a snapshot takes the whole pod
    let podmanEnv = ($env.VIRT_PODMAN_ENV? | default '{}' | from json)
    if 'virt_podman_dir_path' in $podmanEnv {
      let dataDirPath = $"($podmanEnv.virt_podman_dir_path)/($env.SYS_HOST)/($pod)"
      if not ($dataDirPath | path exists) {
        let parentDirPath = ($dataDirPath | path dirname)
        opPrintMaybeRunCmd sudo mkdir -p $parentDirPath
        if (^stat --file-system --format %T $parentDirPath | complete | get stdout | str trim) == 'btrfs' {
          opPrintMaybeRunCmd sudo btrfs subvolume create $dataDirPath
        } else {
          opPrintMaybeRunCmd sudo mkdir -p $dataDirPath
        }
      }
    }

    let boot = if $state == null { not (virtAddOff) } else { $state.enabled }
    opPrintMaybeRunCmd sudo mkdir -p $kubeDirPath
    opPrintMaybeRunCmd $"r#'($allDocs)'#" '|' sudo tee $yamlFilePath '|' ignore
    opPrintMaybeRunCmd $"r#'((($kubeLines | str join "\n") + "\n"))'#" '|' sudo tee $kubeFilePath '|' ignore
    podInstall $pod $boot
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    if ($state == null and $boot) or ($state != null and $state.active) {
      opPrintMaybeRunCmd sudo systemctl start $"($pod).service"
    }
  }

  match $env.VIRT_OP {
    add => {
      let pods = $env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq
      for pod in $pods {
        let podInstances = $env.VIRT_INSTANCES | where { |p| (($p | split row '/') | first) == $pod }

        if (^sudo systemctl is-active $"($pod).service" | complete | get stdout | str trim) == active {
          opPrintWarn $"`($cmd)` pod `($pod)` is already added"
          continue
        }

        doAdd $pod $podInstances $cmd (podState $pod)
      }
    }
    on | off => {
      let on = $env.VIRT_OP == 'on'
      for pod in ($env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq) {
        podInstall $pod $on
        opPrintMaybeRunCmd sudo systemctl daemon-reload
        opPrintMaybeRunCmd sudo systemctl (if $on { 'start' } else { 'stop' }) $"($pod).service"
      }
    }
    list => {
      for pod in (virtListed $cmd $env.VIRT_INSTANCES) {
        try { opPrintRunCmd sudo systemctl status --no-pager --lines 0 $"($pod).service" } catch { |e| opRethrowInterrupt $e }
        # podman takes a pod name filter as a regex, so a bare name also listed every pod it was part of: cave and caveman
        opPrintRunCmd sudo $cmd pod list --filter $"name=^($pod)$" --format '"table {{.Name}}\t{{.Status}}\t{{.Created}}\t{{.NumberOfContainers}}"'
        opPrintRunCmd sudo $cmd container list --filter $"pod=($pod)" --format '"table {{.PodName}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.State}}\t{{.Status}}"'
      }
    }
    rem => {
      let managedNetworks = $env.VIRT_PODMAN_NETWORKS | from json
      let kubeDirPath = '/etc/containers/systemd'

      let pods = if ($env.VIRT_INSTANCES | is-not-empty) {
        $env.VIRT_INSTANCES | each { ($in | split row '/') | first } | uniq
      } else {
        if ($kubeDirPath | path exists) {
          ls $kubeDirPath
            | where name =~ '\.kube$'
            | get name
            | each { |f| $f | path basename | str replace '.kube' '' }
        } else {
          []
        }
      }
      for pod in $pods {
        let yamlFilePath = $"($kubeDirPath)/($pod).yaml"
        let kubeFilePath = $"($kubeDirPath)/($pod).kube"
        let network = readKubeNetwork $kubeFilePath
        opPrintMaybeRunCmd sudo systemctl stop $"($pod).service"
        opPrintMaybeRunCmd sudo rm -rf $yamlFilePath $kubeFilePath $"($kubeFilePath).d"
        opPrintMaybeRunCmd sudo systemctl daemon-reload
        removeNetworkIfUnused $network $pod $managedNetworks
      }
    }
    sync => {
      for pod in ($env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq) {
        if not (virtInstanceHere $cmd $pod) {
          continue
        }

        let state = podState $pod
        opPrintMaybeRunCmd sudo systemctl stop $"($pod).service"

        let podInstances = $env.VIRT_INSTANCES | where { |p| (($p | split row '/') | first) == $pod }
        doAdd $pod $podInstances $cmd $state
      }
      # each pull leaves the image it replaced untagged; drop those so they do not pile up
      opPrintMaybeRunCmd sudo $cmd image prune --force
    }
    tidy => {
      opPrintMaybeRunCmd sudo $cmd system prune --all --force
    }
  }
}
