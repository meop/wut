def readKubeNetwork [kubePath: string] {
  if not ($kubePath | path exists) { return '' }
  let networkLines = open --raw $kubePath | lines | where { $in | str starts-with 'Network=' }
  if ($networkLines | is-empty) { return '' }
  $networkLines | first | str replace 'Network=' '' | str trim
}

def removeNetworkIfUnused [network: string, pod: string, managedNetworks: record] {
  if ($network | is-empty) { return }
  if ($managedNetworks | get --optional $network) == null { return }
  let kubeDir = '/etc/containers/systemd'
  if not ($kubeDir | path exists) {
    opPrintMaybeRunCmd sudo podman network rm $network
    return
  }
  if not (ls $kubeDir
    | where name =~ '\.kube$'
    | where { |f| not ($f.name | str ends-with $"($pod).kube") }
    | each { |f| open --raw $f.name }
    | str join "\n"
    | str contains $"Network=($network)") {
    opPrintMaybeRunCmd sudo podman network rm $network
  }
}

def virtPodmanOp [cmd] {
  let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/podman.yaml'#" ')"' | from yaml
  let managedNetworks = $config | get podman.networks? | default {}

  for instancePath in $env.VIRT_INSTANCES {
    let parts = $instancePath | split row '/'
    let pod = $parts | first

    if ($parts | length) == 1 {
      let kubeDir = '/etc/containers/systemd'
      let kubePath = $"($kubeDir)/($pod).kube"
      let network = readKubeNetwork $kubePath
      opPrintMaybeRunCmd sudo systemctl stop $"($pod).service"
      opPrintMaybeRunCmd sudo rm -f $"($kubeDir)/($pod).yaml" $kubePath
      opPrintMaybeRunCmd sudo systemctl daemon-reload
      removeNetworkIfUnused $network $pod $managedNetworks
    } else {
      let instance = $parts | last

      let kubeDir = '/etc/containers/systemd'
      let yamlPath = $"($kubeDir)/($pod).yaml"
      let kubePath = $"($kubeDir)/($pod).kube"

      if ($yamlPath | path exists) {
        let docs = open --raw $yamlPath | split row "\n---\n" | each { |d| $d | str trim | from yaml }
        let existing = $docs | where { |d| ($d | get kind? | default '') == 'Pod' } | first
        let remaining = $existing.spec.containers | where { |c| $c.name != $instance and not ($c.name | str starts-with $"($instance)-") }

        if ($remaining | is-empty) {
          let network = readKubeNetwork $kubePath
          opPrintMaybeRunCmd sudo systemctl stop $"($pod).service"
          opPrintMaybeRunCmd sudo rm -f $yamlPath $kubePath
          opPrintMaybeRunCmd sudo systemctl daemon-reload
          removeNetworkIfUnused $network $pod $managedNetworks
        } else {
          let allContainerNames = $existing.spec.containers | each { $in.name }
          let remainingNames = $remaining | each { $in.name }
          let filteredAnnotations = $existing
            | get metadata.annotations? | default {}
            | transpose key value
            | where { |kv|
                let suffix = $kv.key | split row '/' | last
                not ($allContainerNames | any { $in == $suffix }) or ($remainingNames | any { $in == $suffix })
              }
            | reduce --fold {} { |kv, acc| $acc | upsert $kv.key $kv.value }
          let combinedYaml = $existing
            | update spec.containers $remaining
            | upsert metadata.annotations $filteredAnnotations
            | to yaml
          opPrintMaybeRunCmd $"r#'($combinedYaml)'#" '|' sudo tee $yamlPath '|' ignore
          opPrintMaybeRunCmd sudo systemctl daemon-reload
          opPrintMaybeRunCmd sudo systemctl restart $"($pod).service"
        }
      }
    }
  }
}
