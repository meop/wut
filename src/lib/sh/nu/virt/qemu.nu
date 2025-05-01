def virtQemu [] {
  mut yn = ''
  mut cmd = 'qemu'
  mut cmdFull = $"($cmd)-system-$($env.SYS_CPU_ARCH)"

  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmdFull | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.VIRT_OP) instances of ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if $env.VIRT_OP == 'down' {
        for instance in $env.VIRT_INSTANCES {
          if (do --ignore-errors { ^pgrep --ignore-ancestors --full --list-full qemu.*$"($instance)" } | is-not-empty) {
            opPrintRunCmd sudo --preserve-env sh -c '"' pkill --full qemu'.*'$"($instance)" '"'
          }
        }
      } else if $env.VIRT_OP == 'list' {
        for instance in $env.VIRT_INSTANCES {
          opPrintRunCmd do --ignore-errors '{' pgrep --ignore-ancestors --full --list-full qemu'.*'$"($instance)" '}'
        }
      } else if $env.VIRT_OP == 'sync' {
        # not applicable
      } else if $env.VIRT_OP == 'tidy' {
        # not applicable
      } else if $env.VIRT_OP == 'up' {
      }
    }
  }
}
