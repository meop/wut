def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (do --ignore-errors { ^sudo $cmd container ls | find --ignore-case $instance | is-not-empty }) {
      continue
    }

    let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    let yaml = opPrintRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"'

    let bindSources = $yaml
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
      | flatten

    for src in $bindSources {
      opPrintMaybeRunCmd sudo mkdir -p $src
    }

    opPrintMaybeRunCmd $"r#'($yaml)'#" '|' $cmd compose --file - up --detach --pull always
  }
}
