def virtQemuOpAdd [config, configVm, cmd, instance] {
  let merged = deepMerge $config $configVm

  mut qemuEnv = {}

  for e in ($merged | get environment? | default [] | each { split row '=' }) {
    $qemuEnv = $qemuEnv | upsert $e.0 $e.1
  }

  $qemuEnv = $qemuEnv | upsert 'instance' $instance

  let cpuStat = ^lscpu
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_SOCKETS' ($cpuStat | find --ignore-case 'socket(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_CORES' ($cpuStat | find --ignore-case 'core(s)' | split row ':' | last | str trim | ansi strip)
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_THREADS' ($cpuStat | find --ignore-case 'thread(s)' | split row ':' | last | str trim | ansi strip)

  let cpuVendor = if ((^cat '/proc/cpuinfo' | find --ignore-case 'vendor_id' | last | split row ':' | last | str downcase | str trim | ansi strip) | str contains 'amd') { 'amd' } else { 'intel' }
  $qemuEnv = $qemuEnv | upsert 'VM_CPU_VENDOR' ($cpuVendor | str trim)

  let nicDirPath = $"/sys/class/net/($qemuEnv.NIC)"
  if not ($nicDirPath | path exists) {
    opPrintWarn $"cannot add `($instance)`: NIC '($qemuEnv.NIC)' does not exist"
    return
  }
  $qemuEnv = $qemuEnv | upsert 'NIC_MAC' (if ('NIC_MAC' in $qemuEnv) {
    $qemuEnv.NIC_MAC
  } else {
    ^cat $"($nicDirPath)/address" | str trim
  })
  $qemuEnv = $qemuEnv | upsert 'NIC_IF_INDEX' (if ('NIC_IF_INDEX' in $qemuEnv) {
    $qemuEnv.NIC_IF_INDEX
  } else {
    ^cat $"($nicDirPath)/ifindex" | str trim
  })

  let sysArch = $qemuEnv.VM_SYS_ARCH
  let sysPlat = $qemuEnv.VM_SYS_PLAT

  if 'VFIO_PCI_DEV_IDS' in $qemuEnv {
    for pciDevId in (($qemuEnv.VFIO_PCI_DEV_IDS | split row ',') | enumerate) {
      $qemuEnv = $qemuEnv | upsert $"VFIO_PCI_DEV_IDS_($pciDevId.index)" $pciDevId.item
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

  if 'qemu' in $merged {
    let serviceName = $"qemu-($instance)"
    let serviceDirPath = '/etc/systemd/system'
    let configDirPath = $"/var/lib/qemu/($instance)"

    let serviceFilePath = ($serviceDirPath | path join $"($serviceName).service")

    opPrintMaybeRunCmd sudo mkdir -p $serviceDirPath
    opPrintMaybeRunCmd sudo mkdir -p $configDirPath

    let tmpDirPath = $"($qemuEnv.TMP_QEMU_DIR_PATH)/($instance)"
    let pidFilePath = ($tmpDirPath | path join qemu.pid)

    mut serviceLines = [
      '[Unit]',
      $"Description=QEMU instance ($instance)",
      'After=network.target',
      '',
      '[Service]',
      'Type=forking',
      $"PIDFile=($pidFilePath)",
      $"WorkingDirectory=($configDirPath)",
      $"ExecStartPre=/usr/bin/mkdir -p ($tmpDirPath)",
    ]

    let unbindEfiFbScriptFilePath = ($configDirPath | path join 'unbind-efi-fb.sh')
    let unbindEfiFbLines = [
      '#!/usr/bin/bash',
      "checkPath='/sys/bus/platform/drivers/efi-framebuffer/efi-framebuffer.0'",
      'if [ ! -e "$checkPath" ]; then exit 0; fi',
      'for vtcon in /sys/class/vtconsole/vtcon*/bind; do',
      '  echo 0 > "$vtcon"',
      'done',
      'echo efi-framebuffer.0 > /sys/bus/platform/drivers/efi-framebuffer/unbind',
    ]
    # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
    # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
    opPrintMaybeRunCmd $"r##'(($unbindEfiFbLines | str join "\n") + "\n")'##" '|' sudo tee $unbindEfiFbScriptFilePath '|' ignore
    opPrintMaybeRunCmd sudo chmod +x $unbindEfiFbScriptFilePath
    $serviceLines = $serviceLines | append [
      $"ExecStartPre=($unbindEfiFbScriptFilePath)",
      'ExecStartPre=/usr/bin/sleep 2',
    ]

    if 'VFIO_PCI_DEV_IDS' in $qemuEnv {
      let rebindScriptFilePath = ($configDirPath | path join 'rebind-vfio-pci.sh')
      let rebindLines = [
        '#!/usr/bin/bash',
        "driver='vfio-pci'",
        $"for fullPciDevId in ($qemuEnv.VFIO_PCI_DEV_IDS | split row ',' | each { |id| $"0000:($id)" } | str join ' '); do",
        '  if [ -e "/sys/bus/pci/devices/$fullPciDevId/driver_override" ]; then',
        '    currentDriver=$(basename $(readlink "/sys/bus/pci/devices/$fullPciDevId/driver" 2>/dev/null) 2>/dev/null)',
        '    if [ "$currentDriver" != "$driver" ]; then',
        '      echo "$driver" > "/sys/bus/pci/devices/$fullPciDevId/driver_override"',
        '      echo "$fullPciDevId" > "/sys/bus/pci/devices/$fullPciDevId/driver/unbind"',
        '      echo "$fullPciDevId" > "/sys/bus/pci/drivers/$driver/bind"',
        '      echo > "/sys/bus/pci/devices/$fullPciDevId/driver_override"',
        '    fi',
        '  fi',
        'done',
      ]
      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'(($rebindLines | str join "\n") + "\n")'##" '|' sudo tee $rebindScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $rebindScriptFilePath
      $serviceLines = $serviceLines | append [
        $"ExecStartPre=($rebindScriptFilePath)",
        'ExecStartPre=/usr/bin/sleep 2',
      ]
    }

    if 'swtpm' in $merged {
      let swtpmScriptFilePath = ($configDirPath | path join swtpm.sh)
      let swtpmArgs = replaceEnv $qemuEnv ($merged | get swtpm?.arguments? | default [])
      let swtpmCmd = $"swtpm(if ($swtpmArgs | length) > 0 { ' ' + ($swtpmArgs | str join ' ') } else { '' })"

      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'((['#!/usr/bin/bash', ('exec ' + $swtpmCmd)] | str join "\n") + "\n")'##" '|' sudo tee $swtpmScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $swtpmScriptFilePath
      $serviceLines = $serviceLines | append [
        $"ExecStartPre=-/usr/bin/pkill --full \"^swtpm.*($instance)\"",
        $"ExecStartPre=-/usr/bin/rm -f ($tmpDirPath)/tpm.socket",
        $"ExecStartPre=($swtpmScriptFilePath)",
        'ExecStartPre=/usr/bin/sleep 2',
      ]
    }

    $serviceLines = $serviceLines | append $"ExecStartPre=-/usr/bin/rm -f ($pidFilePath)"

    let qemuBlock = $merged | get qemu?.architecture? | get --optional $sysArch | default {}
    let qemuBin = $"($cmd)-system-($sysArch)"

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

    let qemuScriptFilePath = ($configDirPath | path join qemu.sh)
    let qemuArgs = replaceEnv $qemuEnv ($merged | get qemu?.arguments? | default [])
    let cpusCount = (($qemuEnv.VM_CPU_SOCKETS | into int) * ($qemuEnv.VM_CPU_CORES | into int) * ($qemuEnv.VM_CPU_THREADS | into int))
    let cpusMax = $cpusCount - 1
    let qemuCmd = $"($qemuBin)(if ($qemuArgs | length) > 0 { ' ' + ($qemuArgs | str join ' ') } else { '' })"
    # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
    # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
    opPrintMaybeRunCmd $"r##'((['#!/usr/bin/bash', ('exec ' + $qemuCmd)] | str join "\n") + "\n")'##" '|' sudo tee $qemuScriptFilePath '|' ignore
    opPrintMaybeRunCmd sudo chmod +x $qemuScriptFilePath
    $serviceLines = $serviceLines | append $"ExecStart=($qemuScriptFilePath)"

    if ($qemuBlock | get cpu?.pin? | default false) {
      let pinScriptFilePath = ($configDirPath | path join qemu-cpu-pin.sh)
      let pinLines = [
        '#!/usr/bin/bash',
        ("pid=$(cat " + $pidFilePath + ")"),
        'if [ -z "$pid" ]; then exit 0; fi',
        ("for i in $(seq 0 " + ($cpusMax | into string) + "); do"),
        "  spid=$(ps --pid $pid -T -o ucmd,spid | grep \"CPU $i/KVM\" | awk '{print $NF}')",
        '  if [ -n "$spid" ]; then',
        '    taskset --pid --cpu-list $i $spid',
        '  fi',
        'done',
      ]
      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'(($pinLines | str join "\n") + "\n")'##" '|' sudo tee $pinScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $pinScriptFilePath
      $serviceLines = $serviceLines | append [
        'ExecStartPost=/usr/bin/sleep 2',
        $"ExecStartPost=($pinScriptFilePath)",
      ]
    }

    $serviceLines = $serviceLines | append [
      'Restart=on-failure',
      '',
      '[Install]',
      'WantedBy=default.target',
    ]
    opPrintMaybeRunCmd $"r#'(($serviceLines | str join "\n") + "\n")'#" '|' sudo tee $serviceFilePath '|' ignore
    opPrintMaybeRunCmd sudo systemctl daemon-reload
    opPrintMaybeRunCmd sudo systemctl enable --now $serviceName
  }
}

def virtQemuOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (^pgrep --ignore-ancestors --full --list-full $"^qemu-system.*($instance)" | complete | get stdout | is-not-empty) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already added"
      continue
    }

    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#" ')"'
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"'

    virtQemuOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $instance
  }
}
