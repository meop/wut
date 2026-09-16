def --env packDnf [] {
  let mgr = 'dnf'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $mgr)
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
