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

  let configEnv = [
    ...($config | get environment? | default []),
    ...($configVm | get environment? | default []),
  ]

  for key in $configEnv {
    let parts = $key | split row '='
    $lxcEnv = $lxcEnv | upsert $parts.0 $parts.1
  }

  $lxcEnv = $lxcEnv | upsert 'instance' $instance

  let lxcDir = $lxcEnv.VIRT_LXC_DIR_PATH
  let rootfsPath = $"($lxcDir)/($instance)/rootfs"

  opPrintMaybeRunCmd sudo mkdir -p $rootfsPath

  mut configLines = [
    $"lxc.uts.name = ($instance)",
    $"lxc.rootfs.path = dir:($rootfsPath)",
  ]
  if ($configVm | get lxc.autostart? | default false) {
    $configLines = $configLines | append 'lxc.start.auto = 1'
  }

  for line in ($config | get lxc.config? | default []) {
    $configLines = $configLines | append (replaceEnv $lxcEnv $line)
  }

  let net = $configVm | get lxc.network? | default {}
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
      $configLines = $configLines | append $"lxc.net.0.veth.pair = lxc-($instance)"
    } else if $net.type == 'macvlan' {
      $configLines = $configLines | append $"lxc.net.0.macvlan.mode = ($net.mode? | default 'bridge')"
    }
    $configLines = $configLines | append 'lxc.net.0.flags = up'
  }

  for mnt in ($configVm | get lxc.mounts? | default []) {
    let source = replaceEnv $lxcEnv $mnt.source
    let target = (replaceEnv $lxcEnv $mnt.target) | str trim --left --char '/'
    $configLines = $configLines | append $"lxc.mount.entry = ($source) ($target) none bind,create=dir 0 0"
  }

  let configContent = ($configLines | str join "\n") + "\n"
  let configPath = $"/var/lib/lxc/($instance)/config"

  opPrintMaybeRunCmd sudo mkdir -p $"/var/lib/lxc/($instance)"

  opPrintMaybeRunCmd $"r#'($configContent)'#" '|' sudo tee $configPath '|' ignore

  opPrintMaybeRunCmd sudo $"($cmd)-start" -n $instance
}

def virtLxcOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (do --ignore-errors { ^sudo $"($cmd)-ls" --running | split row ' ' | str trim | where { |l| $l | is-not-empty } | any { |l| $l == $instance } }) {
      opPrintWarn $"`($cmd)` instance `($instance)` is already up"
      continue
    }

    let urlConfig = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfig)'#" ')"'

    let urlConfigVm = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    let configVm = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfigVm)'#" ')"'

    virtLxcOpAdd ($config | from yaml) ($configVm | from yaml) $cmd $instance
  }
}
