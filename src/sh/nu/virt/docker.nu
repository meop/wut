def virtDocker [] {
  let cmd = 'docker'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $cmd | is-empty) {
    return
  }
  if not (virtPrompt $"use ($cmd) \(system\)") { return }
  match $env.VIRT_OP {
    add => {
      for instance in $env.VIRT_INSTANCES {
        if (^sudo $cmd container ls | complete | get stdout | find --ignore-case $instance | is-not-empty) {
          continue
        }

        let yaml = opPrintRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#"

        for src in ($yaml
          | from yaml
          | get services? | default {}
          | values
          | each { |svc|
              $svc | get volumes? | default []
              | each { |v|
                  if ($v | describe) == string {
                    let host = $v | split row ':' | first
                    if ($host | str starts-with '/') {
                      $host
                    } else {
                      null
                    }
                  } else if ($v | get type? | default '') == bind {
                    $v.source
                  } else {
                    null
                  }
                }
              | compact
            }
          | flatten) {
          opPrintMaybeRunCmd sudo mkdir -p $src
        }

        opPrintMaybeRunCmd $"r#'($yaml)'#" '|' sudo $cmd compose --file - up --detach --pull always
      }
    }
    list => {
      let filters = if ($env.VIRT_INSTANCES | is-not-empty) { $env.VIRT_INSTANCES } else { [] }
      let allInstances = ^sudo $cmd compose ls --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] }
      let instances = if ($filters | is-not-empty) {
        $allInstances | where { |i| $filters | all { |f| $i | str contains --ignore-case $f } }
      } else {
        $allInstances
      }
      let nameFilters = $instances | each { |i| ['--filter', $"name=($i)"] } | flatten
      opPrintRunCmd sudo $cmd container ls --all --format '"table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.State}}\\t{{.Status}}"' --no-trunc ...$nameFilters
    }
    rem => {
      let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
        $env.VIRT_INSTANCES
      } else {
        ^sudo $cmd compose ls --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] }
      }
      for instance in $instances {
        opPrintMaybeRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" '|' sudo $cmd compose --file - down
      }
    }
    sync => {
      for instance in $env.VIRT_INSTANCES {
        opPrintMaybeRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" '|' sudo $cmd compose --file - up --detach --pull always
      }
    }
    tidy => {
      opPrintMaybeRunCmd sudo $cmd system prune --all
    }
  }
}
