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
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'($cmd)'#"
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
    $"echo ($driver) > /sys/bus/pci/devices/($fullPciDevId)/driver_override",
    $"echo ($fullPciDevId) > /sys/bus/pci/devices/($fullPciDevId)/driver/unbind",
    $"echo ($fullPciDevId) > /sys/bus/pci/drivers/($driver)/bind",
    $"echo > /sys/bus/pci/devices/($fullPciDevId)/driver_override",
  ]
  for cmd in $cmds {
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'($cmd)'#"
  }

  if 'NOOP' not-in $env {
    sleep 2sec
  }
}

def virtQemuOpAdd [config, configVm, cmd, cmdSysArch, instance] {
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

  let nicPath = $"/sys/class/net/($qemuEnv.QEMU_HOST_NIC)"
  $qemuEnv = $qemuEnv | upsert 'QEMU_HOST_NIC_MAC' (if ('QEMU_HOST_NIC_MAC' in $qemuEnv) {
    $qemuEnv.QEMU_HOST_NIC_MAC
  } else {
    ^cat $"($nicPath)/address" | str trim
  })
  $qemuEnv = $qemuEnv | upsert 'QEMU_HOST_NIC_IF_INDEX' (if ('QEMU_HOST_NIC_IF_INDEX' in $qemuEnv) {
    $qemuEnv.QEMU_HOST_NIC_IF_INDEX
  } else {
    ^cat $"($nicPath)/ifindex" | str trim
  })

  let sysArch = $qemuEnv.QEMU_GUEST_SYS_ARCH
  let sysPlat = $qemuEnv.QEMU_GUEST_SYS_PLAT

  if 'VFIO_PCI_DEV_IDS' in $qemuEnv {
    for pciDevId in (($qemuEnv.VFIO_PCI_DEV_IDS | split row ',') | enumerate) {
      $qemuEnv = $qemuEnv | upsert $"VFIO_PCI_DEV_IDS_($pciDevId.index)" $pciDevId.item
      virtQemuRebindVfioPci $pciDevId.item
    }
  }

  def envReplace [localEnv, lines] {
    let localEnvItems = $localEnv | items { |key, value| [$key, $value] }

    mut linesX = []
    for l in $lines {
      mut l = $l
      if ($l | str contains '{') {
        for e in $localEnvItems {
          $l = $l | str replace --all $"{($e.0)}" ($e.1)
        }
      }
      $linesX = $linesX | append $l
    }

    return $linesX
  }

  def intoCellPath [...items] {
    $items | each {
      |i| {value: $i, optional: true}
    } | into cell-path
  }

  if 'qemu' in $configVm {
    if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^($cmdSysArch).*($instance)"" '}' '|' is-not-empty) == 'true' {
      opPrintWarn $"`($cmd)` instance `($instance)` is already up"
      return
    }

    if 'swtpm' in $configVm {
      if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm.*($instance)"" '}' '|' is-not-empty) == 'true' {
        opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full "^swtpm.*($instance)"'#"
      }

      let tmpPath = $"($qemuEnv.TMP_QEMU_DIR_PATH)/($instance)"
      if ($tmpPath | path exists) {
        opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'rm --force --recursive "($tmpPath)"'#"
      }

      opPrintMaybeRunCmd mkdir $tmpPath

      let swtpmBin = 'swtpm'

      let qEnv = $qemuEnv
      let swtpmArgs = envReplace $qEnv ($configVm | get swtpm.arguments? | default [])

      let swtpmCmd = $"($swtpmBin)(if ($swtpmArgs | length) > 0 { ' ' + ($swtpmArgs | str join ' ') } else { '' })"
      opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'($swtpmCmd)'#"

      if 'NOOP' not-in $env {
        sleep 2sec
      }
    }

    let qemuBlock = $config | get qemu | get $sysArch
    let qemuBin = $cmdSysArch

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

    let qemuCmd = $"($qemuBin)(if ($qemuArgs | length) > 0 { ' ' + ($qemuArgs | str join ' ') } else { '' })"
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'($qemuCmd)'#"

    if 'NOOP' not-in $env {
      sleep 2sec

      let cpus = 0..<(($qemuEnv.QEMU_GUEST_CPU_SOCKETS | into int) * ($qemuEnv.QEMU_GUEST_CPU_CORES | into int) * ($qemuEnv.QEMU_GUEST_CPU_THREADS | into int))

      let pid = opPrintRunCmd ^pgrep --ignore-ancestors --full --list-full $""^($cmdSysArch).*($instance)"" '|' split row $"r#' '#" '|' first
      let pidThreadInfos = ^ps --pid $pid -T -o ucmd,spid | from ssv

      let pidThreads = $cpus | each { |cpu|
        $pidThreadInfos | each { |threadInfo|
          if ($threadInfo | get CMD | str starts-with $"CPU ($cpu)/KVM") {
            $threadInfo | get SPID
          }
        }
      } | flatten

      for $i in ($pidThreads | enumerate) {
        opPrintRunCmd sudo --preserve-env sh -c $"r#'taskset --pid --cpu-list ($i.index) ($i.item)'#" '|' ignore
      }
    }
  }
}

def virtQemuOp [cmd, cmdSysArch] {
  for instance in $env.VIRT_INSTANCES {
    let urlConfig = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfig)'#" ')"'

    let urlConfigVm = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfigVm)'#" ')"'

    virtQemuUnbindEfiFb
    virtQemuOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $cmdSysArch $instance
  }
}
