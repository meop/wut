def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"'($url)'" ')"' '|' $cmd compose --file - up --detach
  }
}
