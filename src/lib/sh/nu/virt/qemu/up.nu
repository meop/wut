def virtQemuUnbindEfiFb [] {
  let checkPath = '/sys/bus/platform/drivers/efi-framebuffer/efi-framebuffer.0'
  if not ($checkPath | path exists) {
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
  if not ($checkPath | path exists) {
    return
  }

  let checkDriverPath = $"/sys/bus/pci/devices/($fullPciDevId)/driver"
  let currentDriver = (opPrintRunCmd ^readlink $checkDriverPath) | path parse | get stem

  if $currentDriver == $driver {
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

def virtQemuRun [config, configVm] {
  mut qemuEnv = {}

  let configEnv = [
    ...($config | get environment),
    ...($configVm | get environment),
  ]
  for key in $configEnv {
    let parts = $key | split row '='
    $qemuEnv = $qemuEnv| upsert $parts.0 $parts.1
  }

  let cpuStat = ^lscpu
  $qemuEnv = $qemuEnv | upsert 'QEMU_GUEST_CPU_SOCKETS' ($cpuStat | find --ignore-case 'socket(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'QEMU_GUEST_CPU_CORES' ($cpuStat | find --ignore-case 'core(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'QEMU_GUEST_CPU_THREADS' ($cpuStat | find --ignore-case 'thread(s)' | split row ':' | last | str trim | ansi strip)

  let cpuInfo = ^cat '/proc/cpuinfo'
  let cpuVendorFull = $cpuInfo | find --ignore-case 'vendor_id' | last | split row ':' | last | str downcase | str trim | ansi strip
  let cpuVendor = if ($cpuVendorFull | str contains 'amd') { 'amd' } else { 'intel' }
  $qemuEnv = $qemuEnv | upsert 'QEMU_GUEST_CPU_VENDOR' ($cpuVendor | str trim)

  let nicMac = ^cat $"/sys/class/net/($qemuEnv.QEMU_HOST_NIC)/address"
  $qemuEnv = $qemuEnv | upsert 'QEMU_HOST_NIC_MAC' ($nicMac | str trim)

  let nicIfIndex = ^cat $"/sys/class/net/($qemuEnv.QEMU_HOST_NIC)/ifindex"
  $qemuEnv = $qemuEnv | upsert 'QEMU_HOST_NIC_IF_INDEX' ($nicIfIndex | str trim)

  let sysArch = $qemuEnv.QEMU_GUEST_SYS_ARCH
  let sysPlat = $qemuEnv.QEMU_GUEST_SYS_PLAT

  if 'VFIO_PCI_DEV_IDS' in $qemuEnv {
    for pciDevId in ($qemuEnv.VFIO_PCI_DEV_IDS | split row ',') {
      virtQemuRebindVfioPci $pciDevId
    }
  }

  def envReplace [qEnv, args] {
    let qemuEnvList = $qEnv | items { |key, value| [$key, $value] }

    mut newArgs = []
    for a in $args {
      mut a = $a
      if ($a | str contains '{') {
        for e in $qemuEnvList {
          $a = $a | str replace --all $"{($e.0)}" ($e.1)
        }
      }
      $newArgs = $newArgs | append $a
    }

    return $newArgs
  }

  def intoCellPath [...items] {
    $items | each {
      |i| {value: $i, optional: true}
    } | into cell-path
  }

  if 'swtpm' in $configVm {
    let swtpmBlock = $config | get swtpm | get $sysArch
    let swtpmBin = $swtpmBlock | get bin

    let qEnv = $qemuEnv
    let swtpmArgs = envReplace $qEnv ($configVm | get swtpm.arguments? | default [])

    for a in $swtpmArgs {
      if ($a | str contains '--tpmstate') {
        opPrintMaybeRunCmd mkdir $"($a | split row '=' | last | str trim)"
      }
    }

    let swtpmFullCmd = $"($swtpmBin)(if ($swtpmArgs | length) > 0 { ' ' + ($swtpmArgs | str join ' ') } else { '' })"
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"'($swtpmFullCmd)'"

    if 'NOOP' not-in $env {
      sleep 2sec
    }
  }

  if 'qemu' in $configVm {
    let qemuBlock = $config | get qemu | get $sysArch
    let qemuBin = $qemuBlock | get bin

    let qemuCpuFlags = [
      [cpu _ _ flags],
      [cpu $cpuVendor _ flags],
      [cpu _ $sysPlat flags],
      [cpu _ $cpuVendor $sysPlat _ flags],
    ] | each {
      |s| let p = (intoCellPath ...$s)
      if ($qemuBlock | get $p | is-not-empty) {
        $qemuBlock | get $p
      } else {
        []
      }
    } | flatten

    $qemuEnv = $qemuEnv | upsert 'QEMU_GUEST_CPU_FLAGS' (
      if ($qemuCpuFlags | length) > 0 {
        $",($qemuCpuFlags | str join ',')"
      } else {
        ''
      }
    )

    let qEnv = $qemuEnv
    let qemuArgs = envReplace $qEnv ($configVm | get qemu.arguments? | default [])

    let qemuFullCmd = $"($qemuBin)(if ($qemuArgs | length) > 0 { ' ' + ($qemuArgs | str join ' ') } else { '' })"
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"'($qemuFullCmd)'"

    if 'NOOP' not-in $env {
      sleep 2sec
    }
  }
}

def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $"($cmd).*($instance)" '}' '|' is-not-empty) == 'true' {
      opPrintWarn $"($cmd) instance ($instance) is already up"
      continue
    }

    let url = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"'

    let urlVm = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"'($urlVm)'" ')"'

    try {
      virtQemuUnbindEfiFb
      virtQemuRun ($config | from yaml) ($configVm | from yaml)
    } catch {
      |err| $err | print
    }
  }
}
