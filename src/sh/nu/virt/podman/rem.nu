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

def virtPodmanOp [cmd] {
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
    opPrintMaybeRunCmd sudo rm -f $yamlFilePath $kubeFilePath
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    removeNetworkIfUnused $network $pod $managedNetworks
  }
}
