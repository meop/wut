def virtDocker [] {
  mut yn = ''
  let cmd = 'docker'

  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.VIRT_OP) instances of ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if $env.VIRT_OP == 'down' {
        for instance in $env.VIRT_INSTANCES {
          if (^$cmd container ls | find --ignore-case $instance | is-not-empty) {
            let output = mktemp --suffix $".($cmd).($instance).yaml" --tmpdir
            let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
            opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $output
            opPrintMaybeRunCmd $cmd compose --file $"'($output)'" down
            opPrintMaybeRunCmd rm $output
          }
        }
      } else if $env.VIRT_OP == 'list' {
        for instance in $env.VIRT_INSTANCES {
          opPrintMaybeRunCmd $cmd container ls '|' find --ignore-case $instance
        }
      } else if $env.VIRT_OP == 'sync' {
        for instance in $env.VIRT_INSTANCES {
          let output = mktemp --suffix $".($cmd).($instance).yaml" --tmpdir
          let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
          opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $output
          opPrintMaybeRunCmd $cmd compose --file $"'($output)'" pull
          opPrintMaybeRunCmd rm $output
        }
      } else if $env.VIRT_OP == 'tidy' {
        opPrintMaybeRunCmd $cmd system prune --all --volumes
      } else if $env.VIRT_OP == 'up' {
        for instance in $env.VIRT_INSTANCES {
          let output = mktemp --suffix $".($cmd).($instance).yaml" --tmpdir
          let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
          opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $output
          opPrintMaybeRunCmd $cmd compose --file $"'($output)'" up --detach
          opPrintMaybeRunCmd rm $output
        }
      }
    }
  }
}
