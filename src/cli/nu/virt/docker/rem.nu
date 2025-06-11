def virtDockerOp [cmd] {
  for instance in $env.VIRT_INSTANCES {
    if (^$cmd container ls | find --ignore-case $instance | is-not-empty) {
      let url = $"($env.REQ_URL_CFG)/virt/($env.SYS_HOST)/($cmd)/($instance).yaml"
      opPrintMaybeRunCmd '$"(' http get --raw --redirect-mode follow $"r#'($url)'#" ')"' '|' $cmd compose --file - down
    }
  }
}
