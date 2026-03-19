def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if not ($"/var/lib/lxc/($instance)/config" | path exists) {
      continue
    }

    if (do --ignore-errors { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } }) {
      opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
    }

    let addPath = $env.REQ_PATH | str replace '/sync/' '/add/' | str replace '/sh/nu/' '/sh/nu/--yes/'
    let addUrl = $"($env.REQ_ORIG)($addPath)($env.REQ_SRCH)"
    opPrintCmd nu --no-config-file -c '$"(' http get --raw --redirect-mode follow $"r#'($addUrl)'#" ')"'
    if 'NOOP' not-in $env {
      nu --no-config-file -c $"(http get --raw --redirect-mode follow $addUrl)"
    }
  }
}
