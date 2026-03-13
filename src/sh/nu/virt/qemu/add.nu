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
    $qemuEnv = $qemuEnv | upsert $parts.0 $parts.1
  }

  $qemuEnv = $qemuEnv | upsert 'instance' $instance

  let cpuStat = ^lscpu
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_SOCKETS' ($cpuStat | find --ignore-case 'socket(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_CORES' ($cpuStat | find --ignore-case 'core(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_THREADS' ($cpuStat | find --ignore-case 'thread(s)' | split row ':' | last | str trim | ansi strip)

  let cpuInfo = ^cat '/proc/cpuinfo'
  let cpuVendorFull = $cpuInfo | find --ignore-case 'vendor_id' | last | split row ':' | last | str downcase | str trim | ansi strip
  let cpuVendor = if ($cpuVendorFull | str contains 'amd') { 'amd' } else { 'intel' }
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_VENDOR' ($cpuVendor | str trim)

  let nicPath = $"/sys/class/net/($qemuEnv.NIC)"
  $qemuEnv = $qemuEnv | upsert 'NIC_MAC' (if ('NIC_MAC' in $qemuEnv) {
    $qemuEnv.NIC_MAC
  } else {
    ^cat $"($nicPath)/address" | str trim
  })
  $qemuEnv = $qemuEnv | upsert 'NIC_IF_INDEX' (if ('NIC_IF_INDEX' in $qemuEnv) {
    $qemuEnv.NIC_IF_INDEX
  } else {
    ^cat $"($nicPath)/ifindex" | str trim
  })

  let sysArch = $qemuEnv.VM_SYS_ARCH
  let sysPlat = $qemuEnv.VM_SYS_PLAT

  if 'VFIO_PCI_DEV_IDS' in $qemuEnv {
    for pciDevId in (($qemuEnv.VFIO_PCI_DEV_IDS | split row ',') | enumerate) {
      $qemuEnv = $qemuEnv | upsert $"VFIO_PCI_DEV_IDS_($pciDevId.index)" $pciDevId.item
      virtQemuRebindVfioPci $pciDevId.item
    }
  }

  def replaceEnv [localEnv, lines] {
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
    let serviceName = $"qemu-($instance)"
    let serviceDir = '/etc/systemd/system'
    let configDir = $"/var/lib/qemu/($instance)"

    let servicePath = ($serviceDir | path join $"($serviceName).service")

    opPrintMaybeRunCmd sudo mkdir -p $serviceDir
    opPrintMaybeRunCmd sudo mkdir -p $configDir

    let tmpPath = $"($qemuEnv.TMP_QEMU_DIR_PATH)/($instance)"
    let pidFilePath = ($tmpPath | path join qemu.pid)

    mut serviceLines = [
      '[Unit]',
      $"Description=QEMU instance ($instance)",
      'After=network.target',
      '',
      '[Service]',
      'Type=forking',
      $"PIDFile=($pidFilePath)",
      $"WorkingDirectory=($configDir)",
      $"ExecStartPre=/usr/bin/mkdir -p ($tmpPath)",
    ]

    if 'swtpm' in $configVm {
      let swtpmScriptPath = ($configDir | path join swtpm.sh)
      let swtpmArgs = replaceEnv $qemuEnv ($configVm | get swtpm.arguments? | default [])
      let swtpmCmd = $"swtpm(if ($swtpmArgs | length) > 0 { ' ' + ($swtpmArgs | str join ' ') } else { '' })"
      let swtpmContent = (['#!/usr/bin/sh', $"exec ($swtpmCmd)"] | str join "\n") + "\n"

      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'($swtpmContent)'##" '|' sudo tee $swtpmScriptPath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $swtpmScriptPath
      $serviceLines = $serviceLines | append [
        $"ExecStartPre=-/usr/bin/pkill --full \"^swtpm.*($instance)\"",
        $"ExecStartPre=-/usr/bin/rm -f ($tmpPath)/tpm.socket",
        $"ExecStartPre=($swtpmScriptPath)",
        'ExecStartPre=/usr/bin/sleep 2',
      ]
    }

    $serviceLines = $serviceLines | append $"ExecStartPre=-/usr/bin/rm -f ($pidFilePath)"

    let qemuBlock = $config | get qemu | get architecture | get $sysArch
    let qemuBin = $cmdSysArch

    let qemuCpuFlags = [
      [cpu flags],
      [cpu vendor $cpuVendor flags],
      [cpu platform $sysPlat flags],
      [cpu vendor $cpuVendor platform $sysPlat flags],
    ] | each {
      |s| let p = (intoCellPath ...$s)
      if ($qemuBlock | get $p | is-not-empty) {
        $qemuBlock | get $p
      } else {
        []
      }
    } | flatten

    $qemuEnv = $qemuEnv | upsert 'VM_CPU_FLAGS' (
      if ($qemuCpuFlags | length) > 0 {
        $",($qemuCpuFlags | str join ',')"
      } else {
        ''
      }
    )

    let qemuScriptPath = ($configDir | path join qemu.sh)
    let qemuArgs = replaceEnv $qemuEnv ($configVm | get qemu.arguments? | default [])
    let cpusCount = (($qemuEnv.VM_CPU_SOCKETS | into int) * ($qemuEnv.VM_CPU_CORES | into int) * ($qemuEnv.VM_CPU_THREADS | into int))
    let cpusMax = $cpusCount - 1
    let qemuCmd = $"($qemuBin)(if ($qemuArgs | length) > 0 { ' ' + ($qemuArgs | str join ' ') } else { '' })"
    let qemuContent = (['#!/usr/bin/sh', $"exec ($qemuCmd)"] | str join "\n") + "\n"

    # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
    # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
    opPrintMaybeRunCmd $"r##'($qemuContent)'##" '|' sudo tee $qemuScriptPath '|' ignore
    opPrintMaybeRunCmd sudo chmod +x $qemuScriptPath
    $serviceLines = $serviceLines | append $"ExecStart=($qemuScriptPath)"

    if ($qemuBlock | get cpu.pin? | default false) {
      let pinScriptPath = ($configDir | path join pin.sh)
      let pinLines = [
        '#!/usr/bin/sh',
        ("pid=$(cat " + $pidFilePath + ")"),
        'if [ -z "$pid" ]; then exit 0; fi',
        ("for i in $(seq 0 " + ($cpusMax | into string) + "); do"),
        "  spid=$(ps --pid $pid -T -o ucmd,spid | grep \"CPU $i/KVM\" | awk '{print $NF}')",
        '  if [ -n "$spid" ]; then',
        '    taskset --pid --cpu-list $i $spid',
        '  fi',
        'done',
      ]
      let pinContent = ($pinLines | str join "\n") + "\n"

      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'($pinContent)'##" '|' sudo tee $pinScriptPath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $pinScriptPath
      $serviceLines = $serviceLines | append [
        'ExecStartPost=/usr/bin/sleep 2',
        $"ExecStartPost=($pinScriptPath)",
      ]
    }

    $serviceLines = $serviceLines | append [
      'Restart=on-failure',
      '',
      '[Install]',
      'WantedBy=default.target',
    ]
    let serviceContent = ($serviceLines | str join "\n") + "\n"

    opPrintMaybeRunCmd $"r#'($serviceContent)'#" '|' sudo tee $servicePath '|' ignore
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    opPrintMaybeRunCmd sudo systemctl enable --now $serviceName
  }
}

def virtQemuOp [cmd, cmdSysArch] {
  for instance in $env.VIRT_INSTANCES {
    if (do --ignore-errors { ^pgrep --ignore-ancestors --full --list-full $"^($cmdSysArch).*($instance)" | is-not-empty }) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already up"
      continue
    }

    let urlConfig = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfig)'#" ')"'

    let urlConfigVm = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfigVm)'#" ')"'

    virtQemuUnbindEfiFb
    virtQemuOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $cmdSysArch $instance
  }
}
