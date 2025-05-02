def virtQemuUnbindEfiFb [] {
  let checkPath = '/sys/bus/platform/drivers/efi-framebuffer/efi-framebuffer.0'
  if not (checkPath | path exists) {
    return
  }

  let cmds = [
    'echo 0 > /sys/class/vtconsole/vtcon0/bind',
    'echo 0 > /sys/class/vtconsole/vtcon1/bind',
    'echo efi-framebuffer.0 > /sys/bus/platform/drivers/efi-framebuffer/unbind',
  ]
  for cmd in $cmds {
    opPrintRunCmd sudo --preserve-env sh -c $"'($cmd)'"
  }

  if 'NOOP' not-in $env {
    sleep 2sec
  }
}

def virtQemuRebindVfioPci [pciDevId: string] {
  let driver = 'vfio-pci'
  let fullPciDevId = $"0000:($pciDevId)"

  let checkPath = $"/sys/bus/pci/drivers/($fullPciDevId)/driver_override"
  if not (checkPath | path exists) {
    return
  }

  let checkDriver = $"readlink /sys/bus/pci/drivers/($fullPciDevId)/driver"
  opPrintRunCmd ($checkDriver | split row ' ')
}

def virtQemu [] {
  mut yn = ''
  let cmd = 'qemu'
  let cmdArch = $"($cmd)-system-$($env.SYS_CPU_ARCH)"

  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmdArch | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.VIRT_OP) instances of ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if $env.VIRT_OP == 'down' {
        for instance in $env.VIRT_INSTANCES {
          if (do --ignore-errors { ^pgrep --ignore-ancestors --full --list-full $"($cmd)".*$"($instance)" } | is-not-empty) {
            opPrintRunCmd sudo --preserve-env sh -c '"' pkill --full $"($cmd)"'.*'$"($instance)" '"'
          }
        }
      } else if $env.VIRT_OP == 'list' {
        for instance in $env.VIRT_INSTANCES {
          opPrintRunCmd do --ignore-errors '{' pgrep --ignore-ancestors --full --list-full $"($cmd)"'.*'$"($instance)" '}'
        }
      } else if $env.VIRT_OP == 'sync' {
        # not applicable
      } else if $env.VIRT_OP == 'tidy' {
        # not applicable
      } else if $env.VIRT_OP == 'up' {
        for instance in $env.VIRT_INSTANCES {
          let outputCmd = mktemp --suffix $".($cmd).yaml" --tmpdir
          let urlCmd = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
          opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($urlCmd)'" ')"' '|' save --force $"'($outputCmd)'"

          let output = mktemp --suffix $".($cmd).($instance).yaml" --tmpdir
          let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
          opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $"'($output)'"



          opPrintRunCmd rm $"'($outputCmd)'"
          opPrintRunCmd rm $"'($output)'"
        }
      }
    }
  }
}
