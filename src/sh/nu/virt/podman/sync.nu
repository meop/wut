def virtPodmanOp [cmd] {
  let kubeDir = '/etc/containers/systemd'

  for pod in ($env.VIRT_INSTANCES | each { |p| ($p | split row '/') | first } | uniq) {
    if not ($"($kubeDir)/($pod).kube" | path exists) {
      continue
    }

    opPrintMaybeRunCmd sudo systemctl stop $"($pod).service"

    let addPath = $env.REQ_PATH | str replace '/sync/' '/add/' | str replace '/sh/nu/' '/sh/nu/--yes/'
    let addUrl = $"($env.REQ_ORIG)($addPath)($env.REQ_SRCH)"
    opPrintCmd nu --no-config-file -c '$"(' http get --raw --redirect-mode follow $"r#'($addUrl)'#" ')"'
    if 'NOOP' not-in $env {
      nu --no-config-file -c $"(http get --raw --redirect-mode follow $addUrl)"
    }
  }
}
