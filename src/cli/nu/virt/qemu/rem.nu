def virtQemuOpRem [config, cmd, cmdSysArch, instance] {
  mut qemuEnv = {}

  let configEnv = [
    ...($config | get environment),
  ]

  for key in $configEnv {
    let parts = $key | split row '='
    $qemuEnv = $qemuEnv | upsert $parts.0 $parts.1
  }

  mut found = false
  if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^($cmdSysArch).*($instance)"" '}' '|' is-not-empty) == 'true' {
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full "^($cmdSysArch).*($instance)"'#"
    $found = true
  }

  if (opPrintRunCmd do --ignore-errors '{' ^pgrep --ignore-ancestors --full --list-full $""^swtpm.*($instance)"" '}' '|' is-not-empty) == 'true' {
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'pkill --full "^swtpm.*($instance)"'#"
  }

  let tmpPath = $"($qemuEnv.TMP_QEMU_DIR_PATH)/($instance)"
  if ($tmpPath | path exists) {
    opPrintMaybeRunCmd sudo --preserve-env sh -c $"r#'rm --force --recursive "($tmpPath)"'#"
  }

  if not $found {
    opPrintWarn $"`($cmd)` instance `($instance)` is already down"
  }
}

def virtQemuOp [cmd, cmdSysArch] {
  for instance in $env.VIRT_INSTANCES {
    let urlConfig = $"($env.REQ_URL_CFG)/virt/($cmd).yaml"
    let config = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($urlConfig)'#" ')"'

    virtQemuOpRem ($config | from yaml) $cmd $cmdSysArch $instance
  }
}
