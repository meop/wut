def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"' '|' sudo $cmd compose --file - up --detach --pull always
  }
}
