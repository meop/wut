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

def virtLxcOpAdd [config, configVm, cmd, instance] {
  let merged = deepMerge $config $configVm

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
      (if $net.type == 'veth' { [$"lxc.net.0.veth.pair = veth-($instance)"] } else if $net.type == 'macvlan' { [$"lxc.net.0.macvlan.mode = ($net.mode? | default 'bridge')"] } else { [] }),
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

def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (^sudo $"($cmd)-ls" --running | complete | get stdout | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance }) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already added"
      continue
    }

    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#" ')"'
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"'

    virtLxcOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $instance
  }
}
