def virtQemu [] {
  let cmd = 'qemu'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $"($cmd)-img" | is-empty) {
    return
  }
  if $env.VIRT_OP == tidy {
    return
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

  # one flag per line: a human reads these while working out why a vm will not boot
  def qemuCmdWrap [cmd: string, args: list<string>] {
    let sep = " \\\n  "
    $cmd + (if ($args | length) > 0 { $sep + ($args | str join $sep) } else { '' })
  }

  def fetchInstanceYaml [cmd, name] {
    opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($name).yaml'#" | from yaml
  }

  # requested is "glass" or "glass/vfio" (fragment folder) — either way, instance resolves to "glass"
  def resolveInstance [cmd, requested] {
    if not ($requested | str contains '/') {
      return {instance: $requested, config: (fetchInstanceYaml $cmd $requested)}
    }
    let baseName = ($requested | split row '/' | first)
    let baseConfig = fetchInstanceYaml $cmd $baseName
    let fragmentConfig = fetchInstanceYaml $cmd $requested
    {instance: $baseName, config: (virtDeepMerge $baseConfig $fragmentConfig)}
  }

  # `add glass/vfio` installs the unit as `qemu-glass`, so the variant is not recoverable from the service
  # name — doAdd records it and sync replays it, rather than rebuilding from a base config that for some
  # instances is not a functional vm on its own
  def qemuVariantOf [instance] {
    let variantFilePath = $"/var/lib/qemu/($instance)/variant"
    if ($variantFilePath | path exists) {
      let variant = (open --raw $variantFilePath | lines | get 0? | default '' | str trim)
      if ($variant | is-not-empty) {
        return $"($instance)/($variant)"
      }
    }
    $instance
  }

  def qemuInstanceRunning [instance] {
    (^pgrep --ignore-ancestors --full --list-full $"^qemu-system.*($instance)" | complete | get stdout | is-not-empty)
  }

  def buildQemuSetup [cmd, instance] {
    let config = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#"
    let resolved = resolveInstance $cmd $instance
    let instance = $resolved.instance
    let merged = virtDeepMerge ($config | from yaml) $resolved.config

    mut qemuEnv = {}

    for e in ($merged | get environment? | default [] | each { split row '=' }) {
      $qemuEnv = $qemuEnv | upsert $e.0 $e.1
    }

    $qemuEnv = $qemuEnv | upsert 'instance' $instance

    let cpuStat = ^lscpu
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_sockets' ($cpuStat | find --ignore-case 'socket(s)' | split row ':' | last | str trim | ansi strip)
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_cores' ($cpuStat | find --ignore-case 'core(s)' | split row ':' | last | str trim | ansi strip)
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_threads' ($cpuStat | find --ignore-case 'thread(s)' | split row ':' | last | str trim | ansi strip)

    let cpuVendor = if ((^cat '/proc/cpuinfo' | find --ignore-case 'vendor_id' | last | split row ':' | last | str lowercase | str trim | ansi strip) | str contains 'amd') { 'amd' } else { 'intel' }
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_vendor' ($cpuVendor | str trim)

    let nicDirPath = $"/sys/class/net/($qemuEnv.nic)"
    if not ($nicDirPath | path exists) {
      opPrintWarn $"cannot use `($instance)`: NIC '($qemuEnv.nic)' does not exist"
      return null
    }
    $qemuEnv = $qemuEnv | upsert 'nic_mac' (if ('nic_mac' in $qemuEnv) {
      $qemuEnv.nic_mac
    } else {
      ^cat $"($nicDirPath)/address" | str trim
    })
    $qemuEnv = $qemuEnv | upsert 'nic_if_index' (if ('nic_if_index' in $qemuEnv) {
      $qemuEnv.nic_if_index
    } else {
      ^cat $"($nicDirPath)/ifindex" | str trim
    })

    let sysArch = $qemuEnv.vm_sys_arch
    let sysPlat = $qemuEnv.vm_sys_plat

    if ($qemuEnv | get --optional vfio_pci_dev_ids | default '' | is-not-empty) {
      for pciDevId in (($qemuEnv.vfio_pci_dev_ids | split row ',') | enumerate) {
        $qemuEnv = $qemuEnv | upsert $"vfio_pci_dev_ids_($pciDevId.index)" $pciDevId.item
      }
    }

    let qemuBlock = $merged | get qemu?.architecture? | get --optional $sysArch | default {}

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

    $qemuEnv = $qemuEnv | upsert 'vm_cpu_flags' (
      if ($qemuCpuFlags | length) > 0 {
        $",($qemuCpuFlags | str join ',')"
      } else {
        ''
      }
    )

    {instance: $instance, merged: $merged, qemuEnv: $qemuEnv, qemuBlock: $qemuBlock, sysArch: $sysArch}
  }

  def doAdd [cmd, instance] {
    let setup = buildQemuSetup $cmd $instance
    if ($setup == null) {
      return
    }
    let requested = $instance
    let instance = $setup.instance
    if (qemuInstanceRunning $instance) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already added"
      return
    }

    let merged = $setup.merged
    mut qemuEnv = $setup.qemuEnv
    let qemuBlock = $setup.qemuBlock
    let sysArch = $setup.sysArch

    if 'qemu' in $merged {
      let serviceName = $"qemu-($instance)"
      let serviceDirPath = '/etc/systemd/system'
      let configDirPath = $"/var/lib/qemu/($instance)"

      let serviceFilePath = ($serviceDirPath | path join $"($serviceName).service")

      opPrintMaybeRunCmd sudo mkdir -p $serviceDirPath
      opPrintMaybeRunCmd sudo mkdir -p $configDirPath

      let variantFilePath = ($configDirPath | path join variant)
      let variant = ($requested | split row '/' | skip 1 | str join '/')
      if ($variant | is-empty) {
        opPrintMaybeRunCmd sudo rm -f $variantFilePath
      } else {
        opPrintMaybeRunCmd $"r#'(($variant) + "\n")'#" '|' sudo tee $variantFilePath '|' ignore
      }

      let tmpDirPath = $"($qemuEnv.tmp_qemu_dir_path)/($instance)"
      let pidFilePath = ($tmpDirPath | path join qemu.pid)

      mut serviceLines = [
        '[Unit]',
        $"Description=QEMU instance ($instance)",
        'Wants=network-online.target',
        'After=network-online.target',
        'StartLimitIntervalSec=300',
        'StartLimitBurst=3',
        '',
        '[Service]',
        'Type=forking',
        'KillMode=control-group',
        'OOMScoreAdjust=-500',
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
        ## the handover needs to settle before the gpu is rebound; the early exit above skips it entirely
        'sleep 2',
      ]
      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'(($unbindEfiFbLines | str join "\n") + "\n")'##" '|' sudo tee $unbindEfiFbScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $unbindEfiFbScriptFilePath
      $serviceLines = $serviceLines | append $"ExecStartPre=($unbindEfiFbScriptFilePath)"

      if ($qemuEnv | get --optional vfio_pci_dev_ids | default '' | is-not-empty) {
        let rebindScriptFilePath = ($configDirPath | path join 'rebind-vfio-pci.sh')
        let rebindLines = [
          '#!/usr/bin/bash',
          "driver='vfio-pci'",
          "rebound=''",
          $"for fullPciDevId in ($qemuEnv.vfio_pci_dev_ids | split row ',' | each { |id| $"0000:($id)" } | str join ' '); do",
          '  if [ -e "/sys/bus/pci/devices/$fullPciDevId/driver_override" ]; then',
          '    currentDriver=$(basename $(readlink "/sys/bus/pci/devices/$fullPciDevId/driver" 2>/dev/null) 2>/dev/null)',
          '    if [ "$currentDriver" != "$driver" ]; then',
          '      echo "$driver" > "/sys/bus/pci/devices/$fullPciDevId/driver_override"',
          '      echo "$fullPciDevId" > "/sys/bus/pci/devices/$fullPciDevId/driver/unbind"',
          '      echo "$fullPciDevId" > "/sys/bus/pci/drivers/$driver/bind"',
          '      echo > "/sys/bus/pci/devices/$fullPciDevId/driver_override"',
          "      rebound=1",
          '    fi',
          '  fi',
          'done',
          ## the common case is already bound at host boot, so the settle is dead time unless something moved
          'if [ -n "$rebound" ]; then sleep 2; fi',
        ]
        # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
        # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
        opPrintMaybeRunCmd $"r##'(($rebindLines | str join "\n") + "\n")'##" '|' sudo tee $rebindScriptFilePath '|' ignore
        opPrintMaybeRunCmd sudo chmod +x $rebindScriptFilePath
        $serviceLines = $serviceLines | append $"ExecStartPre=($rebindScriptFilePath)"
      }

      if 'swtpm' in $merged {
        let swtpmScriptFilePath = ($configDirPath | path join swtpm.sh)
        let swtpmArgs = replaceEnv $qemuEnv ($merged | get swtpm?.arguments? | default [])
        let swtpmCmd = (qemuCmdWrap 'swtpm' $swtpmArgs)

        let swtpmLines = [
          '#!/usr/bin/bash',
          ("socketPath='" + $tmpDirPath + "/tpm.socket'"),
          ($swtpmCmd + ' || exit 1'),
          # --daemon returns before the control socket is listening, and qemu exits if it connects first
          'for _ in $(seq 1 500); do',
          '  if [ -S "$socketPath" ]; then exit 0; fi',
          '  sleep 0.01',
          'done',
          'exit 1',
        ]
        # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
        # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
        opPrintMaybeRunCmd $"r##'(($swtpmLines | str join "\n") + "\n")'##" '|' sudo tee $swtpmScriptFilePath '|' ignore
        opPrintMaybeRunCmd sudo chmod +x $swtpmScriptFilePath
        $serviceLines = $serviceLines | append [
          $"ExecStartPre=-/usr/bin/pkill --full \"^swtpm.*($instance)\"",
          $"ExecStartPre=-/usr/bin/rm -f ($tmpDirPath)/tpm.socket",
          $"ExecStartPre=($swtpmScriptFilePath)",
        ]
      }

      $serviceLines = $serviceLines | append $"ExecStartPre=-/usr/bin/rm -f ($pidFilePath)"

      let qemuBin = $"($cmd)-system-($sysArch)"

      let qemuScriptFilePath = ($configDirPath | path join qemu.sh)
      let qemuArgs = (replaceEnv $qemuEnv ($merged | get qemu?.arguments? | default [])) | append [$"-pidfile ($pidFilePath)", '-daemonize']
      let cpusCount = (($qemuEnv.vm_cpu_sockets | into int) * ($qemuEnv.vm_cpu_cores | into int) * ($qemuEnv.vm_cpu_threads | into int))
      let cpusMax = $cpusCount - 1
      let qemuCmd = (qemuCmdWrap $qemuBin $qemuArgs)
      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'((['#!/usr/bin/bash', ('exec ' + $qemuCmd)] | str join "\n") + "\n")'##" '|' sudo tee $qemuScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $qemuScriptFilePath
      $serviceLines = $serviceLines | append $"ExecStart=($qemuScriptFilePath)"

      let qmpSocketPath = $"($tmpDirPath)/qmp.socket"
      let shutdownScriptFilePath = ($configDirPath | path join qemu-shutdown.sh)
      let shutdownLines = [
        '#!/usr/bin/bash',
        'qmpSocket="$1"',
        'pidFile="$2"',
        'timeoutSec="${3:-45}"',
        # no qmp socket, no socat to speak it, or qemu not listening yet — let systemd kill it rather than
        # sit out the whole timeout waiting on a shutdown that was never sent
        'if [ ! -S "$qmpSocket" ]; then exit 0; fi',
        'if ! command -v socat > /dev/null 2>&1; then exit 0; fi',
        '',
        'pid=$(cat "$pidFile" 2>/dev/null)',
        'if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then exit 0; fi',
        '',
        '{',
        "  echo '{\"execute\":\"qmp_capabilities\"}'",
        "  echo '{\"execute\":\"system_powerdown\"}'",
        '} | timeout 5 socat - "UNIX-CONNECT:$qmpSocket" > /dev/null 2>&1',
        '',
        'waited=0',
        'while kill -0 "$pid" 2>/dev/null; do',
        '  if [ "$waited" -ge "$timeoutSec" ]; then exit 0; fi',
        '  sleep 1',
        '  waited=$((waited + 1))',
        'done',
      ]
      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'(($shutdownLines | str join "\n") + "\n")'##" '|' sudo tee $shutdownScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $shutdownScriptFilePath
      $serviceLines = $serviceLines | append $"ExecStop=($shutdownScriptFilePath) ($qmpSocketPath) ($pidFilePath) 45"

      if ($qemuBlock | get cpu?.pin? | default false) {
        let pinScriptFilePath = ($configDirPath | path join qemu-cpu-pin.sh)
        let pinLines = [
          '#!/usr/bin/bash',
          ("pidFile='" + $pidFilePath + "'"),
          # -daemonize returns before the vcpu threads exist, so wait for them rather than guess at a delay
          'for _ in $(seq 1 500); do',
          '  pid=$(cat "$pidFile" 2>/dev/null)',
          '  if [ -n "$pid" ] && ps --pid "$pid" -T -o ucmd | grep -q "CPU 0/KVM"; then break; fi',
          '  sleep 0.01',
          'done',
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
        $serviceLines = $serviceLines | append $"ExecStartPost=($pinScriptFilePath)"
      }

      $serviceLines = $serviceLines | append [
        'Restart=on-failure',
        'RestartSec=5',
        'TimeoutStopSec=60',
        '',
        '[Install]',
        'WantedBy=default.target',
      ]
      opPrintMaybeRunCmd $"r#'(($serviceLines | str join "\n") + "\n")'#" '|' sudo tee $serviceFilePath '|' ignore
      opPrintMaybeRunCmd sudo systemctl daemon-reload
      opPrintMaybeRunCmd sudo systemctl enable --now $serviceName
    }
  }

  # foreground, no systemd unit — skips vfio unbind/rebind and cpu-pin
  def doRun [cmd, instance] {
    let setup = buildQemuSetup $cmd $instance
    if ($setup == null) {
      return
    }
    let instance = $setup.instance
    if (qemuInstanceRunning $instance) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already running"
      return
    }

    let merged = $setup.merged
    mut qemuEnv = $setup.qemuEnv
    let sysArch = $setup.sysArch

    if 'qemu' not-in $merged {
      return
    }

    # never /var/lib/qemu/<instance>: that is doAdd's, and the unit there references every script in it
    let tmpDirPath = $"($qemuEnv.tmp_qemu_dir_path)/($instance)"
    let runDirPath = ($tmpDirPath | path join run)

    opPrintMaybeRunCmd sudo mkdir -p $tmpDirPath
    opPrintMaybeRunCmd sudo mkdir -p $runDirPath

    if 'swtpm' in $merged {
      let swtpmScriptFilePath = ($runDirPath | path join swtpm.sh)
      let swtpmArgs = replaceEnv $qemuEnv ($merged | get swtpm?.arguments? | default [])
      let swtpmCmd = (qemuCmdWrap 'swtpm' $swtpmArgs)

      # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
      # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
      opPrintMaybeRunCmd $"r##'((['#!/usr/bin/bash', ('exec ' + $swtpmCmd)] | str join "\n") + "\n")'##" '|' sudo tee $swtpmScriptFilePath '|' ignore
      opPrintMaybeRunCmd sudo chmod +x $swtpmScriptFilePath
      try { opPrintMaybeRunCmd sudo pkill --full --ignore-ancestors $"^swtpm.*($instance)" }
      opPrintMaybeRunCmd sudo rm -f $"($tmpDirPath)/tpm.socket"
      opPrintMaybeRunCmd sudo $swtpmScriptFilePath
    }

    let qemuBin = $"($cmd)-system-($sysArch)"
    let qemuScriptFilePath = ($runDirPath | path join qemu.sh)
    # doAdd appends these; run is foreground, so drop them wherever they come from
    let qemuArgs = replaceEnv $qemuEnv ($merged | get qemu?.arguments? | default [])
      | where { |a| not (($a | str starts-with '-daemonize') or ($a | str starts-with '-pidfile')) }
    let qemuCmd = (qemuCmdWrap $qemuBin $qemuArgs)
    # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
    # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
    opPrintMaybeRunCmd $"r##'((['#!/usr/bin/bash', ('exec ' + $qemuCmd)] | str join "\n") + "\n")'##" '|' sudo tee $qemuScriptFilePath '|' ignore
    opPrintMaybeRunCmd sudo chmod +x $qemuScriptFilePath

    try { opPrintMaybeRunCmd sudo $qemuScriptFilePath }

    try { opPrintMaybeRunCmd sudo pkill --full --ignore-ancestors $"^swtpm.*($instance)" }
    opPrintMaybeRunCmd sudo rm -rf $runDirPath
  }

  def doRem [cmd, instance] {
    let serviceName = $"qemu-($instance)"
    let serviceDirPath = '/etc/systemd/system'
    let serviceFilePath = ($serviceDirPath | path join $"($serviceName).service")
    let configDirPath = $"/var/lib/qemu/($instance)"

    let cleanedService = $serviceFilePath | path exists
    if $cleanedService {
      opPrintMaybeRunCmd sudo systemctl disable --now $serviceName
      opPrintMaybeRunCmd sudo rm -f $serviceFilePath
      opPrintMaybeRunCmd sudo systemctl daemon-reload
    }

    let cleanedConfig = $configDirPath | path exists
    if $cleanedConfig {
      opPrintMaybeRunCmd sudo rm -rf $configDirPath
    }

    if not ($cleanedService or $cleanedConfig) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already removed"
    }
  }

  match $env.VIRT_OP {
    add => {
      for instance in $env.VIRT_INSTANCES {
        doAdd $cmd $instance
      }
    }
    list => {
      let serviceDirPath = '/etc/systemd/system'
      for instance in (if ($serviceDirPath | path exists) {
        ls $serviceDirPath
          | where name =~ '/qemu-[^/]+\.service$'
          | get name
          | each { |f| $f | path basename | str replace 'qemu-' '' | str replace '.service' '' }
          | if ($env.VIRT_INSTANCES | is-not-empty) { where { |i| $env.VIRT_INSTANCES | all { |f| $i | str contains --ignore-case $f } } } else { $in }
      } else { [] }) {
        try { opPrintRunCmd sudo systemctl status --no-pager --lines 0 $"qemu-($instance).service" }
        try { opPrintRunCmd pgrep --ignore-ancestors --full --list-full $"^swtpm.*($instance)" }
        try { opPrintRunCmd pgrep --ignore-ancestors --full --list-full $"^qemu-system.*($instance)" }
      }
    }
    rem => {
      let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
        $env.VIRT_INSTANCES
      } else {
        let serviceDirPath = '/etc/systemd/system'
        if ($serviceDirPath | path exists) {
          ls $serviceDirPath
            | where name =~ '/qemu-[^/]+\.service$'
            | get name
            | each { |f| $f | path basename | str replace 'qemu-' '' | str replace '.service' '' }
        } else {
          []
        }
      }
      for instance in $instances {
        doRem $cmd $instance
      }
    }
    run => {
      for instance in $env.VIRT_INSTANCES {
        doRun $cmd $instance
      }
    }
    sync => {
      for requested in $env.VIRT_INSTANCES {
        let instance = ($requested | split row '/' | first)
        if not ($"/etc/systemd/system/qemu-($instance).service" | path exists) {
          continue
        }

        opPrintMaybeRunCmd sudo systemctl stop $"qemu-($instance)"

        doAdd $cmd (if ($requested | str contains '/') { $requested } else { qemuVariantOf $instance })
      }
    }
  }
}
