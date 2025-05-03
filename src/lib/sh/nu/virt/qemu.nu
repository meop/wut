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
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"'($cmd)'"
  }

  if 'NOOP' not-in $env {
    sleep 2sec
  }
}

def virtQemuRebindVfioPci [pciDevId] {
  let driver = 'vfio-pci'
  let fullPciDevId = $"0000:($pciDevId)"

  let checkPath = $"/sys/bus/pci/devices/($fullPciDevId)/driver_override"
  if not (checkPath | path exists) {
    return
  }

  let checkDriver = $"readlink /sys/bus/pci/devices/($fullPciDevId)/driver"
  let currentDriver  = (opPrintMaybeRunCmd ($checkDriver | split row ' '))

  if currentDriver == $driver {
    return
  }

  let cmds = [
    $"echo ($driver) > /sys/bus/pci/drivers/($fullPciDevId)/driver_override",
    $"echo ($fullPciDevId) > /sys/bus/pci/devices/($fullPciDevId)/driver/unbind",
    $"echo ($fullPciDevId) > /sys/bus/pci/drivers/($driver)/bind",
    $"echo > /sys/bus/pci/devices/($fullPciDevId)/driver_override",
  ]
  for cmd in $cmds {
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"'($cmd)'"
  }

  if 'NOOP' not-in $env {
    sleep 2sec
  }
}

def virtQemuRun [qemuConfig, qemuConfigVm] {
  let qemuEnv = {}
  let qemuConfigEnv = [
    ...($qemuConfig | get environment),
    ...($qemuConfigVm | get environment),
  ]

  for key in $qemuConfigEnv {
    let parts = $key | split row '='
    $parts | print
    $qemuEnv | upsert $parts.0 $parts.1
    $qemuEnv | print
  }
}

def virtQemu [] {
  mut yn = ''
  let cmd = 'qemu'
  let cmdSysArch = $"($cmd)-system-($env.SYS_CPU_ARCH)"

  if ('VIRT_MANAGER' not-in $env or $env.VIRT_MANAGER == $cmd) and (which $cmdSysArch | is-not-empty) {
    if 'YES' in $env {
      $yn = 'y'
    } else {
      $yn = input $"? ($env.VIRT_OP) instances of ($cmd) \(system\) [y, [n]] "
    }
    if $yn != 'n' {
      if $env.VIRT_OP == 'down' {
        for instance in $env.VIRT_INSTANCES {
          if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}' '|' is-not-empty) {
            opPrintMaybeRunCmd sudo --preserve-env sh -c '"' pkill --full $"($cmd).*($instance)" '"'
            continue
          }
          opPrintWarn $"($cmd) instance ($instance) is already down"
        }
      } else if $env.VIRT_OP == 'list' {
        for instance in $env.VIRT_INSTANCES {
          opPrintMaybeRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}'
        }
      } else if $env.VIRT_OP == 'sync' {
        # not applicable
      } else if $env.VIRT_OP == 'tidy' {
        # not applicable
      } else if $env.VIRT_OP == 'up' {
        for instance in $env.VIRT_INSTANCES {
          if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}' '|' is-not-empty) {
            opPrintWarn $"($cmd) instance ($instance) is already up"
            continue
          }

          let output = mktemp --suffix $".($cmd).yaml" --tmpdir
          let url = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
          opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' save --force $output

          let outputVm = mktemp --suffix $".($cmd).($instance).yaml" --tmpdir
          let urlVm = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
          opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($urlVm)'" ')"' '|' save --force $outputVm

          try {
            virtQemuRun ($output | open) ($outputVm | open)
          } catch {
            |err| $err | print
          }

          opPrintRunCmd rm $output
          opPrintRunCmd rm $outputVm
        }
      }
    }
  }
}
