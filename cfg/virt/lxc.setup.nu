def lxcSetupHolds [script: string] {
  (null | ^sudo lxc-attach --name $env.VIRT_INSTANCE -- /bin/sh -c $script | complete).exit_code == 0
}

def lxcSetupAsRoot [script: string] {
  opPrintMaybeRunCmd null '|' sudo lxc-attach --name $env.VIRT_INSTANCE -- /bin/sh -ec $"r#'($script)'#" 'o+e>|' cat
}
