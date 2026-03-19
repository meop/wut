def virtDockerOp [cmd] {
  let instances = if ($env.VIRT_INSTANCES | is-not-empty) {
    $env.VIRT_INSTANCES
  } else {
    try { ^sudo $cmd compose ls --format json | from json | get Name } catch { [] }
  }
  for instance in $instances {
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"' '|' sudo $cmd compose --file - down
  }
}
