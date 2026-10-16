# the kernel's own cpu list form ("0-1,8-9"), so a script can compare it against what /proc and sysfs read back
def virtQemuCpuList [cpus: list<int>] {
  $cpus | sort | reduce --fold [] { |c, acc|
    if ($acc | is-not-empty) and (($acc | last).hi + 1 == $c) {
      $acc | drop | append {lo: ($acc | last).lo, hi: $c}
    } else {
      $acc | append {lo: $c, hi: $c}
    }
  } | each { |r| if $r.lo == $r.hi { $"($r.lo)" } else { $"($r.lo)-($r.hi)" } } | str join ','
}

# the host's performance cores as sockets of cores of cpus, every list sorted: efficiency cores are left out, and uneven
# counts (a core with smt off, a socket short a core) trim to what every socket and core can mirror
def virtQemuHostCores [sysRoot: string] {
  let cpuDir = ($sysRoot | path join devices/system/cpu)
  let readSys = { |path: string| open --raw $path | into string | str trim }
  let expand = { |list: string|
    $list | split row ',' | each { |r| let b = ($r | split row '-' | into int); seq $b.0 ($b | last) } | flatten
  }
  let online = (do $expand (do $readSys ($cpuDir | path join online)))

  # intel hybrid names its performance cores; elsewhere the scheduler's own cpu_capacity sets a slower core type well
  # below the rest, and a kernel without it schedules every cpu as one type
  let coreTypeFilePath = ($sysRoot | path join devices/cpu_core/cpus)
  let perf = if ($coreTypeFilePath | path exists) {
    do $expand (do $readSys $coreTypeFilePath) | where { |c| $c in $online }
  } else {
    let capacities = $online | each { |c|
      let f = ($cpuDir | path join $"cpu($c)/cpu_capacity")
      {cpu: $c, capacity: (if ($f | path exists) { do $readSys $f | into int } else { 1024 })}
    }
    let top = ($capacities | get capacity | math max)
    $capacities | where { |c| $c.capacity * 10 >= $top * 9 } | get cpu
  }

  let sockets = $perf | each { |c|
    let topo = ($cpuDir | path join $"cpu($c)/topology")
    {
      cpu: $c,
      socket: (do $readSys ($topo | path join physical_package_id) | into int),
      core: (do $readSys ($topo | path join thread_siblings_list)),
    }
  } | group-by --to-table socket | each { |s|
    $s.items | group-by --to-table core | each { |k| $k.items | get cpu | sort } | sort-by { first }
  } | sort-by { first | first }

  let cores = ($sockets | each { length } | math min)
  let threads = ($sockets | each { |s| $s | first $cores | each { length } } | flatten | math min)
  {
    online: $online,
    sockets: ($sockets | each { |s| $s | first $cores | each { |k| $k | first $threads } }),
  }
}

# the cores per socket no instance is given: the first `reserve` of each, kept for the host, the other managers'
# containers, and qemu's own threads. `virtQemuReserved` is every online cpu outside the pool, efficiency cores included
def virtQemuPool [topo: record, reserve: int] {
  $topo.sockets | each { |s| $s | skip $reserve }
}

def virtQemuReserved [topo: record, reserve: int] {
  let pool = (virtQemuPool $topo $reserve | flatten | flatten)
  $topo.online | where { |c| $c not-in $pool }
}

# cores per socket kept back from every instance, from the host's limits.yaml
def virtQemuReserveCores [] {
  $env.VIRT_LIMITS? | default '{}' | from json | get cpu?.reserve?.cores? | default 0
}

# the host cores behind an instance, the same number in every socket, from the start of the pool or with `reverse` its
# end. instances are sized against the whole pool, never against each other: a second one started while the first is
# idle shares its cores, unless they take from opposite ends and fit there together. `want` unset takes the pool. `pin`
# lists the host cpu behind each vcpu in qemu's own order (socket, core, thread), so the threads the guest sees as
# siblings are siblings on the host too
def virtQemuClaim [topo: record, reserve: int, want?: int, --reverse] {
  let pool = (virtQemuPool $topo $reserve)
  let most = ($pool | each { length } | math min)
  let cores = ($want | default $most)
  if $most < 1 {
    return {error: 'no cores outside the reserve'}
  }
  if $cores < 1 or $cores > $most {
    return {error: $"wants ($cores) cores, the pool has ($most)"}
  }
  {
    sockets: ($topo.sockets | length),
    cores: $cores,
    threads: ($topo.sockets | first | first | length),
    pin: ($pool | each { |s| if $reverse { $s | last $cores } else { $s | first $cores } } | flatten | flatten),
    host: (virtQemuCpuList (virtQemuReserved $topo $reserve)),
  }
}

# the whole host for one instance, as a host without a reserve gives it
def virtQemuHostCpus [sysRoot: string] {
  virtQemuClaim (virtQemuHostCores $sysRoot) 0
}

# the qemu configs that do not fit this host: each wants cores per socket, from the pool its cores leave after the reserve
def virtQemuMisfits [topo: record, reserve: int, wants: record] {
  let cores = ($topo.sockets | each { length } | math min)
  let pool = ($cores - $reserve)
  if $pool < 1 {
    return [$"cpu.reserve.cores ($reserve) takes all ($cores) cores"]
  }
  $wants | transpose name cores | where { |w| $w.cores < 1 or $w.cores > $pool } | each { |w| $"($w.name) wants ($w.cores) cores, ($pool) available" }
}

# every virt add and sync stops here if the configs as checked in cannot be deployed together on this host
def virtQemuFitRun [] {
  if ($env.VIRT_QEMU_WANTS? == null) or not (virtManagerHere qemu) {
    return
  }
  let misfits = (virtQemuMisfits (virtQemuHostCores '/sys') (virtQemuReserveCores) ($env.VIRT_QEMU_WANTS | from json))
  if ($misfits | is-not-empty) {
    opPrintErr 'virt blocked, qemu configs do not fit limits.yaml:'
    for m in $misfits { opPrintErr $"  ($m)" }
    exit 1
  }
}

# the processes an instance runs, found by what names that instance alone: qemu by its -name, which every instance's
# config gives it, and swtpm by the instance's own dir in its socket and state paths, which wut puts under
# tmp_qemu_dir_path/<instance>. a bare .*glass took any process whose command line held glass anywhere, so starting
# glass killed glass2's tpm. both are extended regexes, for pgrep and pkill
def virtQemuMatch [instance: string] {
  $"^qemu-system.* -name \(guest=\)?($instance)\(,| |$\)"
}

def virtSwtpmMatch [instance: string] {
  $"^swtpm.*/($instance)/"
}

def --env virtQemu [] {
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
    (^pgrep --ignore-ancestors --full --list-full (virtQemuMatch $instance) | complete | get stdout | is-not-empty)
  }

  # an instance that cannot be set up is skipped and the run goes on, reported at the end the way pack reports its failures
  def --env failSetup [instance, why] {
    load-env {VIRT_FAILED: (($env.VIRT_FAILED? | default []) | append $"`($instance)`: ($why)")}
  }

  def --env buildQemuSetup [cmd, instance] {
    let config = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#"
    let resolved = resolveInstance $cmd $instance
    let instance = $resolved.instance
    let merged = virtDeepMerge ($config | from yaml) $resolved.config

    mut qemuEnv = {}

    for e in ($merged | get environment? | default [] | each { split row '=' }) {
      $qemuEnv = $qemuEnv | upsert $e.0 $e.1
    }

    $qemuEnv = $qemuEnv | upsert 'instance' $instance

    let cpuVendor = if ((^cat '/proc/cpuinfo' | find --ignore-case 'vendor_id' | last | split row ':' | last | str lowercase | str trim | ansi strip) | str contains 'amd') { 'amd' } else { 'intel' }
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_vendor' ($cpuVendor | str trim)

    let nicDirPath = $"/sys/class/net/($qemuEnv.nic)"
    if not ($nicDirPath | path exists) {
      failSetup $instance $"NIC '($qemuEnv.nic)' does not exist"
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

    let want = ($qemuBlock | get cpu?.cores? | default null)
    let reverse = ($qemuBlock | get cpu?.reverse? | default false)
    if ($reverse | describe) != 'bool' {
      return {instance: $instance, unfit: $"cpu.reverse is ($reverse), not true or false"}
    }
    let claim = (virtQemuClaim (virtQemuHostCores '/sys') (virtQemuReserveCores) $want --reverse=$reverse)
    if 'error' in $claim {
      return {instance: $instance, unfit: $claim.error}
    }
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_sockets' ($claim.sockets | into string)
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_cores' ($claim.cores | into string)
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_threads' ($claim.threads | into string)
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_pin' ($claim.pin | str join ' ')
    $qemuEnv = $qemuEnv | upsert 'vm_cpu_host' $claim.host

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

  # sync replaces a running instance only once its setup is known to fit: one that does not is left as it was
  def --env doAdd [cmd, requested, --replace] {
    let setup = buildQemuSetup $cmd $requested
    if ($setup == null) {
      return
    }
    if 'unfit' in $setup {
      failSetup $setup.instance $setup.unfit
      return
    }
    let instance = $setup.instance
    # read before a replace stops it
    let state = if (virtInstanceHere $cmd $instance) { virtUnitState $"qemu-($instance)" } else { null }
    if $replace {
      opPrintMaybeRunCmd sudo systemctl stop $"qemu-($instance)"
    }
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

      # its disks' folder, made when missing: on btrfs a subvolume, with copy on write off for the images
      let dataDirPath = $"($qemuEnv | get --optional virt_qemu_dir_path | default '/virt/qemu')/($instance)"
      if not ($dataDirPath | path exists) {
        let parentDirPath = ($dataDirPath | path dirname)
        opPrintMaybeRunCmd sudo mkdir -p $parentDirPath
        if (^stat --file-system --format %T $parentDirPath | complete | get stdout | str trim) == 'btrfs' {
          opPrintMaybeRunCmd sudo btrfs subvolume create $dataDirPath
          opPrintMaybeRunCmd sudo chattr +C $dataDirPath
        } else {
          opPrintMaybeRunCmd sudo mkdir -p $dataDirPath
        }
      }

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
        'OOMScoreAdjust=-1000',
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
      } else {
        opPrintMaybeRunCmd sudo rm -f ($configDirPath | path join 'rebind-vfio-pci.sh')
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
          $"ExecStartPre=-/usr/bin/pkill --full \"(virtSwtpmMatch $instance)\"",
          $"ExecStartPre=-/usr/bin/rm -f ($tmpDirPath)/tpm.socket",
          $"ExecStartPre=($swtpmScriptFilePath)",
        ]
      } else {
        opPrintMaybeRunCmd sudo rm -f ($configDirPath | path join swtpm.sh)
      }

      $serviceLines = $serviceLines | append $"ExecStartPre=-/usr/bin/rm -f ($pidFilePath)"

      let qemuBin = $"($cmd)-system-($sysArch)"

      let qemuScriptFilePath = ($configDirPath | path join qemu.sh)
      let qemuArgs = (replaceEnv $qemuEnv ($merged | get qemu?.arguments? | default [])) | append [$"-pidfile ($pidFilePath)", '-daemonize']
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

      # while any qemu instance runs, every other manager's containers, all under machine.slice, keep to the reserve at a
      # tenth of the default cpu weight. runtime only: each instance sets it as it starts, and the last to stop lets go
      if ($qemuEnv.vm_cpu_host | is-not-empty) {
        $serviceLines = $serviceLines | append [
          # every process the unit starts, swtpm and qemu's own threads included, begins on the reserve; the pin script
          # moves only the vcpus off it
          $"CPUAffinity=($qemuEnv.vm_cpu_host)",
          $"ExecStartPre=/usr/bin/systemctl set-property --runtime machine.slice AllowedCPUs=($qemuEnv.vm_cpu_host) CPUWeight=10",
          "ExecStopPost=/usr/bin/bash -c 'systemctl list-units --state=active,activating --no-legend --plain \"qemu-*.service\" | grep -q . || systemctl set-property --runtime machine.slice AllowedCPUs= CPUWeight='",
        ]
      }

      if ($qemuBlock | get cpu?.pin? | default false) {
        let pinScriptFilePath = ($configDirPath | path join qemu-cpu-pin.sh)
        let vfioDevs = ($qemuEnv | get --optional vfio_pci_dev_ids | default '' | split row ',' | where { is-not-empty } | each { |id| $"0000:($id)" } | str join ' ')
        let pinLines = [
          '#!/usr/bin/bash',
          ("pidFile='" + $pidFilePath + "'"),
          ("vcpuCpus=(" + $qemuEnv.vm_cpu_pin + ")"),
          ("hostCpus='" + $qemuEnv.vm_cpu_host + "'"),
          ("vfioDevs=(" + $vfioDevs + ")"),
          # -daemonize returns before the vcpu threads exist, so wait for the last one rather than guess at a delay
          'lastVcpu="CPU $((${#vcpuCpus[@]} - 1))/KVM"',
          'for _ in $(seq 1 500); do',
          '  pid=$(cat "$pidFile" 2>/dev/null)',
          '  if [ -n "$pid" ] && grep -qx "$lastVcpu" /proc/$pid/task/*/comm 2>/dev/null; then break; fi',
          '  sleep 0.01',
          'done',
          'if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then exit 0; fi',
          # each vcpu to its own host cpu; every other thread (main loop, iothreads, vhost, rcu, the worker pools) to the
          # host's cpus, re-checked because a pool thread inherits the cpus of whichever thread spawned it
          'pinThreads() {',
          '  for task in /proc/$pid/task/*; do',
          '    name=$(cat "$task/comm" 2>/dev/null) || continue',
          '    want=$hostCpus',
          '    if [[ $name =~ ^CPU\ ([0-9]+)/KVM$ ]]; then want=${vcpuCpus[${BASH_REMATCH[1]}]}; fi',
          r#'    have=$(awk '/^Cpus_allowed_list/ { print $2 }' "$task/status" 2>/dev/null)'#,
          '    if [ -n "$want" ] && [ "$have" != "$want" ]; then taskset --pid --cpu-list "$want" "${task##*/}" > /dev/null 2>&1; fi',
          '  done',
          '}',
          # the guest's driver asks for the passthrough devices' interrupts when it enables msi, long after qemu starts and
          # again after every guest reboot, and the host would otherwise land them on a vcpu's cpu
          'pinIrqs() {',
          '  for dev in "${vfioDevs[@]}"; do',
          r#'    for irq in $(awk -v d="($dev)" 'index($0, d) { sub(":", "", $1); print $1 }' /proc/interrupts); do'#,
          '      if [ "$(cat /proc/irq/$irq/smp_affinity_list 2>/dev/null)" != "$hostCpus" ]; then echo "$hostCpus" > /proc/irq/$irq/smp_affinity_list 2>/dev/null; fi',
          '    done',
          '  done',
          '}',
          'pinThreads',
          'if [ -z "$hostCpus" ]; then exit 0; fi',
          '(',
          '  while kill -0 "$pid" 2>/dev/null; do',
          '    pinThreads',
          '    pinIrqs',
          '    sleep 5',
          '  done',
          ') > /dev/null 2>&1 &',
        ]
        # content starts with #!, so use r##'...'## instead of r#'...'# — nushell misparsed r#'# as a comment start
        # fix merged in 0.101, then reverted: https://github.com/nushell/nushell/pull/14548
        opPrintMaybeRunCmd $"r##'(($pinLines | str join "\n") + "\n")'##" '|' sudo tee $pinScriptFilePath '|' ignore
        opPrintMaybeRunCmd sudo chmod +x $pinScriptFilePath
        $serviceLines = $serviceLines | append $"ExecStartPost=($pinScriptFilePath)"
      } else {
        opPrintMaybeRunCmd sudo rm -f ($configDirPath | path join qemu-cpu-pin.sh)
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
      if $state == null {
        if not (virtAddOff) {
          opPrintMaybeRunCmd sudo systemctl enable --now $serviceName
        }
      } else if $state.active {
        opPrintMaybeRunCmd sudo systemctl start $serviceName
      }
    }
  }

  # foreground, no systemd unit — skips vfio unbind/rebind and cpu-pin
  def --env doRun [cmd, instance] {
    let setup = buildQemuSetup $cmd $instance
    if ($setup == null) {
      return
    }
    if 'unfit' in $setup {
      failSetup $setup.instance $setup.unfit
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
      try { opPrintMaybeRunCmd sudo pkill --full --ignore-ancestors (virtSwtpmMatch $instance) } catch { |e| opRethrowInterrupt $e }
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

    # the cleanup runs however qemu ended, twice if a ctrl-c cuts it short; a ctrl-c stops the run after
    let failure = (try { opPrintMaybeRunCmd sudo $qemuScriptFilePath; null } catch { |e| $e })
    let cut = (try { doRunCleanup $instance $runDirPath; null } catch { |e| doRunCleanup $instance $runDirPath; $e })
    if $failure != null {
      opRethrowInterrupt $failure
    }
    if $cut != null {
      opRethrowInterrupt $cut
    }
  }

  def doRunCleanup [instance, runDirPath] {
    try { opPrintMaybeRunCmd sudo pkill --full --ignore-ancestors (virtSwtpmMatch $instance) } catch { |e| opRethrowInterrupt $e }
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
    on | off => {
      for instance in $env.VIRT_INSTANCES {
        opPrintMaybeRunCmd sudo systemctl (if $env.VIRT_OP == 'on' { 'enable' } else { 'disable' }) --now $"qemu-($instance)"
      }
    }
    list => {
      for instance in (virtListed $cmd $env.VIRT_INSTANCES) {
        try { opPrintRunCmd sudo systemctl status --no-pager --lines 0 $"qemu-($instance).service" } catch { |e| opRethrowInterrupt $e }
        try { opPrintRunCmd pgrep --ignore-ancestors --full --list-full $"\"(virtSwtpmMatch $instance)\"" } catch { |e| opRethrowInterrupt $e }
        try { opPrintRunCmd pgrep --ignore-ancestors --full --list-full $"\"(virtQemuMatch $instance)\"" } catch { |e| opRethrowInterrupt $e }
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
        if not (virtInstanceHere $cmd $instance) {
          continue
        }

        doAdd --replace $cmd (if ($requested | str contains '/') { $requested } else { qemuVariantOf $instance })
      }
    }
  }
}
