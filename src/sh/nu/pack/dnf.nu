def --env packDnf [] {
  let cmd = 'dnf'
  if (packSkip $cmd) {
    return
  }

  let cmd = packElevate $cmd

  packRefreshForOp 'dnf'

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd list --upgrades]
    }
    remove => {
      packOpRemove [$cmd remove]
    }
    sync => {
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd clean all]
      packOp [$cmd autoremove]
    }
  }
}
