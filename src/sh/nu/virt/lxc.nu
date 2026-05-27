def virtLxc [] {
  let cmd = 'lxc'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $"($cmd)-ls" | is-empty) {
    return
  }
  if $env.VIRT_OP == tidy {
    return
  }
  mut yn = ''
  if YES in $env {
    $yn = 'y'
  } else {
    $yn = input $"use ($cmd) \(system\) [y,[n]]: "
  }
  if $yn == n {
    return
  }

  def flattenLxcConfig [cfg, prefix = ''] {
    mut lines = []
    for kv in ($cfg | transpose key value) {
      let key = if $prefix == '' { $kv.key } else { $"($prefix).($kv.key)" }
      let desc = ($kv.value | describe)
      if ($desc | str starts-with 'record') {
        $lines = $lines | append (flattenLxcConfig $kv.value $key)
      } else if ($desc | str starts-with 'list') {
        for item in $kv.value {
          $lines = $lines | append $"lxc.($key) = ($item)"
        }
      } else {
        $lines = $lines | append $"lxc.($key) = ($kv.value)"
      }
    }
    $lines
  }

  def replaceEnv [localEnv, value] {
    mut v = $value
    if ($v | str contains '{') {
      for e in ($localEnv | items { |k, val| [$k, $val] }) {
        $v = $v | str replace --all $"{($e.0)}" ($e.1)
      }
    }
    $v
  }

  def doAdd [cmd, instance] {
    let config = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#"
    let configVm = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#"
    let merged = deepMerge ($config | from yaml) ($configVm | from yaml)

    mut lxcEnv = {}

    for e in ($merged | get environment? | default [] | each { split row '=' }) {
      $lxcEnv = $lxcEnv | upsert $e.0 $e.1
    }

    $lxcEnv = $lxcEnv | upsert 'instance' $instance

    let lxcDirPath = $lxcEnv.VIRT_LXC_DIR_PATH
    let rootfsDirPath = $"($lxcDirPath)/($instance)/rootfs"
    $lxcEnv = $lxcEnv | upsert 'rootfs' $rootfsDirPath
    let lxcEnv = $lxcEnv

    let net = $merged | get lxc?.network? | default {}
    if ('link' in $net) and not ($"/sys/class/net/($net.link)" | path exists) {
      opPrintWarn $"cannot add `($instance)`: network link '($net.link)' does not exist"
      return
    }

    for mnt in ($merged | get lxc?.mounts? | default []) {
      opPrintMaybeRunCmd sudo mkdir -p (replaceEnv $lxcEnv $mnt.source)
    }

    opPrintMaybeRunCmd sudo mkdir -p $rootfsDirPath

    let rootfsReady = (^sudo test -d $"($rootfsDirPath)/usr" | complete).exit_code == 0
    if not $rootfsReady {
      let template = $merged | get lxc?.create?.template?
      let templateName = ($template | columns | get 0?) | default 'download'
      opPrintMaybeRunCmd sudo lxc-create --name $instance --lxcpath $lxcDirPath --template $templateName -- ...(
        (if ($templateName in ($template | columns)) { $template | get $templateName } else { {} })
        | transpose key value
        | each { |kv| [$"--($kv.key)", $kv.value] }
        | flatten
      )
      opPrintMaybeRunCmd sudo rm -f $"($lxcDirPath)/($instance)/config"
    }

    let autostart = $merged | get lxc?.autostart? | default false

    let configLines = [
      [$"lxc.uts.name = ($instance)", $"lxc.rootfs.path = dir:($rootfsDirPath)"],
      (if $autostart { ['lxc.start.auto = 1'] } else { [] }),
      (flattenLxcConfig ($merged | get lxc?.config? | default {}) | each { |l| replaceEnv $lxcEnv $l }),
      (if ($net | is-not-empty) { [
        [$"lxc.net.0.type = ($net.type)", $"lxc.net.0.link = ($net.link)", $"lxc.net.0.name = ($net.name)"],
        (if 'hwaddr' in $net { [$"lxc.net.0.hwaddr = ($net.hwaddr)"] } else { [] }),
        (if $net.type == veth { [$"lxc.net.0.veth.pair = veth-($instance)"] } else if $net.type == macvlan { [$"lxc.net.0.macvlan.mode = ($net.mode? | default bridge)"] } else { [] }),
        ['lxc.net.0.flags = up'],
      ] | flatten } else { [] }),
      ($merged | get lxc?.mounts? | default [] | each { |mnt| $"lxc.mount.entry = (replaceEnv $lxcEnv $mnt.source) ((replaceEnv $lxcEnv $mnt.target) | str trim --left --char '/') none bind,create=dir 0 0" }),
    ] | flatten

    opPrintMaybeRunCmd sudo mkdir -p $"/var/lib/lxc/($instance)"

    opPrintMaybeRunCmd $"r#'(($configLines | str join "\n") + "\n")'#" '|' sudo tee $"/var/lib/lxc/($instance)/config" '|' ignore

    if $autostart {
      opPrintMaybeRunCmd sudo systemctl enable lxc
    }

    opPrintMaybeRunCmd sudo $"($cmd)-start" --name $instance
  }

  def doRem [cmd, instance] {
    let wasRunning = ^sudo $"($cmd)-ls" --running | complete | get stdout | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance }
    if $wasRunning {
      opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
    }

    let hasConfig = $"/var/lib/lxc/($instance)" | path exists
    if $hasConfig {
      opPrintMaybeRunCmd sudo rm -rf $"/var/lib/lxc/($instance)"
    }

    if not ($wasRunning or $hasConfig) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already removed"
    }
  }

  match $env.VIRT_OP {
    add => {
      for instance in $env.VIRT_INSTANCES {
        if (^sudo $"($cmd)-ls" --running | complete | get stdout | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance }) {
          opPrintWarn $"`($cmd)` instance `($instance)` is already added"
          continue
        }

        doAdd $cmd $instance
      }
    }
    list => {
      let filters = if ($env.VIRT_INSTANCES | is-not-empty) { $env.VIRT_INSTANCES } else { [] }
      let allInstances = ^sudo $"($cmd)-ls" | complete | get stdout | split row ' ' | str trim | where { is-not-empty }
      let instances = if ($filters | is-not-empty) {
        $allInstances | where { |i| $filters | all { |f| $i | str contains --ignore-case $f } }
      } else {
        $allInstances
      }
      for instance in $instances {
        opPrintRunCmd sudo $"($cmd)-ls" --fancy --fancy-format '"NAME,IPV4,IPV6,STATE,AUTOSTART"' -- $instance
      }
    }
    rem => {
      let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
        $env.VIRT_INSTANCES
      } else {
        let lxcDirPath = '/var/lib/lxc'
        if ($lxcDirPath | path exists) {
          ls $lxcDirPath | where type == dir | get name | each { |f| $f | path basename }
        } else {
          []
        }
      }
      for instance in $instances {
        doRem $cmd $instance
      }
    }
    sync => {
      for instance in $env.VIRT_INSTANCES {
        if not ($"/var/lib/lxc/($instance)/config" | path exists) {
          continue
        }

        if (^sudo $"($cmd)-ls" --running | complete | get stdout | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance }) {
          opPrintMaybeRunCmd sudo $"($cmd)-stop" --name $instance
        }

        doAdd $cmd $instance
      }
    }
  }
}
