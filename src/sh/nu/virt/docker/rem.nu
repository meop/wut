def virtDockerOp [cmd] {
  let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
    $env.VIRT_INSTANCES
  } else {
    ^sudo $cmd compose ls --format json | complete | get stdout | if ($in | is-not-empty) { from json | get Name } else { [] }
  }
  for instance in $instances {
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"' '|' sudo $cmd compose --file - down
  }
}
