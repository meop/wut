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
  mut lxcEnv = {}

  for e in ([...($config | get environment? | default []), ...($configVm | get environment? | default [])] | each { split row '=' }) {
    $lxcEnv = $lxcEnv | upsert $e.0 $e.1
  }

  $lxcEnv = $lxcEnv | upsert 'instance' $instance

  let lxcDir = $lxcEnv.VIRT_LXC_DIR_PATH
  let rootfsPath = $"($lxcDir)/($instance)/rootfs"
  $lxcEnv = $lxcEnv | upsert 'rootfs' $rootfsPath

  opPrintMaybeRunCmd sudo mkdir -p $rootfsPath

  let rootfsReady = do --ignore-errors { ^sudo test -d $"($rootfsPath)/usr"; true } | default false
  if not $rootfsReady {
    let template = $configVm | get lxc.create.template? | default ($config | get lxc.create.template?)
    let templateName = ($template | columns | get 0?) | default 'download'
    opPrintMaybeRunCmd sudo lxc-create --name $instance --lxcpath $lxcDir --template $templateName -- ...(
      (if ($templateName in ($template | columns)) { $template | get $templateName } else { {} })
      | transpose key value
      | each { |kv| [$"--($kv.key)", $kv.value] }
      | flatten
    )
    opPrintMaybeRunCmd sudo rm -f $"($lxcDir)/($instance)/config"
  }

  mut configLines = [
    $"lxc.uts.name = ($instance)",
    $"lxc.rootfs.path = dir:($rootfsPath)",
  ]
  let autostart = $configVm | get lxc.autostart? | default ($config | get lxc.autostart? | default false)
  if $autostart {
    $configLines = $configLines | append 'lxc.start.auto = 1'
  }

  for line in (flattenLxcConfig ($config | get lxc.config? | default {})) {
    $configLines = $configLines | append (replaceEnv $lxcEnv $line)
  }
  for line in (flattenLxcConfig ($configVm | get lxc.config? | default {})) {
    $configLines = $configLines | append (replaceEnv $lxcEnv $line)
  }

  let net = ($config | get lxc.network? | default {}) | merge ($configVm | get lxc.network? | default {})
  if ($net | is-not-empty) {
    $configLines = $configLines | append [
      $"lxc.net.0.type = ($net.type)",
      $"lxc.net.0.link = ($net.link)",
      $"lxc.net.0.name = ($net.name)",
    ]
    if 'hwaddr' in $net {
      $configLines = $configLines | append $"lxc.net.0.hwaddr = ($net.hwaddr)"
    }
    if $net.type == 'veth' {
      $configLines = $configLines | append $"lxc.net.0.veth.pair = veth-($instance)"
    } else if $net.type == 'macvlan' {
      $configLines = $configLines | append $"lxc.net.0.macvlan.mode = ($net.mode? | default 'bridge')"
    }
    $configLines = $configLines | append 'lxc.net.0.flags = up'
  }

  for mnt in ([...($config | get lxc.mounts? | default []), ...($configVm | get lxc.mounts? | default [])]) {
    $configLines = $configLines | append $"lxc.mount.entry = (replaceEnv $lxcEnv $mnt.source) ((replaceEnv $lxcEnv $mnt.target) | str trim --left --char '/') none bind,create=dir 0 0"
  }

  opPrintMaybeRunCmd sudo mkdir -p $"/var/lib/lxc/($instance)"

  opPrintMaybeRunCmd $"r#'(($configLines | str join "\n") + "\n")'#" '|' sudo tee $"/var/lib/lxc/($instance)/config" '|' ignore

  if $autostart {
    opPrintMaybeRunCmd sudo systemctl enable lxc
  }

  opPrintMaybeRunCmd sudo $"($cmd)-start" --name $instance
}

def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (do --ignore-errors { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } }) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already up"
      continue
    }

    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($cmd).yaml'#" ')"'
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"'

    virtLxcOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $instance
  }
}
