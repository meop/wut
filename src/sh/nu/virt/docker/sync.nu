def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (do --ignore-errors { ^sudo $cmd container ls | find --ignore-case $instance | is-empty }) {
      continue
    }
    opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml'#" ')"' '|' $cmd compose --file - up --detach --pull always
  }
}
