def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (^sudo $cmd container ls | complete | get stdout | find --ignore-case $instance | is-not-empty) {
      continue
    }

    let yaml = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"'

    for src in ($yaml
      | from yaml
      | get services? | default {}
      | values
      | each { |svc|
          $svc | get volumes? | default []
          | each { |v|
              if ($v | describe) == 'string' {
                let host = $v | split row ':' | first
                if ($host | str starts-with '/') {
                  $host
                } else {
                  null
                }
              } else if ($v | get type? | default '') == 'bind' {
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
