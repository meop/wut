def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if not ($"/etc/systemd/system/qemu-($instance).service" | path exists) {
      continue
    }

    opPrintMaybeRunCmd sudo systemctl stop $"qemu-($instance)"

    let addPath = $env.REQ_PATH | str replace '/sync' '/add' | str replace '/sh/nu/' '/sh/nu/--yes/'
    let addUrl = $"($env.REQ_ORIG)($addPath)($env.REQ_SRCH)"
    opPrintCmd nu --no-config-file -c '$"(' http get --raw --redirect-mode follow $"r#'($addUrl)'#" ')"'
    if 'NOOP' not-in $env {
      nu --no-config-file -c $"(http get --raw --redirect-mode follow $addUrl)"
    }
  }
}
