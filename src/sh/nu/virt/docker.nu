def virtDocker [] {
  let cmd = 'docker'
  if ('VIRT_MANAGER' in $env and $env.VIRT_MANAGER != $cmd) or (which $cmd | is-empty) {
    return
  }

  # the keys wut owns in daemon.json: machine.slice as every container's parent, then docker.yaml's
  def dockerDaemon [] {
    let daemonFilePath = '/etc/docker/daemon.json'
    let current = if ($daemonFilePath | path exists) { open --raw $daemonFilePath | into string | from json } else { {} }
    let config = try { http get --raw --redirect-mode follow $"($env.REQ_URL_CFG)/virt/docker.yaml" | from yaml } catch { |e| opRethrowInterrupt $e; {} }
    let wanted = {'cgroup-parent': 'machine.slice'} | merge ($config | get --optional docker.daemon | default {})
    let changed = ($wanted | columns | where { |k| ($current | get --optional $k) != ($wanted | get $k) })
    if ($changed | is-empty) {
      return
    }
    for k in $changed {
      opPrintInfo $"  daemon.json ($k) -> ($wanted | get $k | to json --raw)"
    }
    opPrintMaybeRunCmd sudo mkdir -p ($daemonFilePath | path dirname)
    opPrintMaybeRunCmd $"r#'((($current | merge $wanted) | to json --indent 2) + "\n")'#" '|' sudo tee $daemonFilePath '|' ignore
    opPrintMaybeRunCmd sudo systemctl restart docker
  }
  if $env.VIRT_OP in ['add' 'sync'] {
    dockerDaemon
  }

  def composeRunning [instance] {
    ^sudo docker compose ls --all --format json | complete | get stdout
      | if ($in | is-not-empty) { from json } else { [] }
      | where Name == $instance
      | any { |p| $p.Status | str contains 'running' }
  }

  match $env.VIRT_OP {
    add => {
      for instance in $env.VIRT_INSTANCES {
        # its compose project, running or not, by name: a container that only mentions it is someone else's
        if (virtInstanceHere $cmd $instance) {
          opPrintWarn $"`($cmd)` instance `($instance)` is already added"
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

        let start = if (virtAddOff) { '--no-start' } else { '--detach' }
        opPrintMaybeRunCmd $"r#'($yaml)'#" '|' sudo $cmd compose --project-name $instance --file - up $start --pull always
      }
    }
    on | off => {
      for instance in $env.VIRT_INSTANCES {
        opPrintMaybeRunCmd sudo $cmd compose --project-name $instance (if $env.VIRT_OP == 'on' { 'start' } else { 'stop' })
      }
    }
    list => {
      # an instance is a compose project, so its containers are the ones compose labelled with it. a name filter
      # matched part of a container's name, which put mydb's containers under db, and with no instance at all there
      # was no filter, so every container on the machine was listed
      for instance in (virtListed $cmd $env.VIRT_INSTANCES) {
        opPrintRunCmd sudo $cmd container ls --all --filter $"label=com.docker.compose.project=($instance)" --format '"table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.State}}\\t{{.Status}}"' --no-trunc
      }
    }
    rem => {
      let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
        $env.VIRT_INSTANCES
      } else {
        ^sudo $cmd compose ls --all --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] }
      }
      for instance in $instances {
        opPrintMaybeRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" '|' sudo $cmd compose --project-name $instance --file - down
      }
    }
    sync => {
      for instance in $env.VIRT_INSTANCES {
        if not (virtInstanceHere $cmd $instance) {
          continue
        }

        let start = if (composeRunning $instance) { '--detach' } else { '--no-start' }
        opPrintMaybeRunCmd http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" '|' sudo $cmd compose --project-name $instance --file - up $start --pull always
      }
    }
    tidy => {
      opPrintMaybeRunCmd sudo $cmd system prune --all --force
    }
  }
}
