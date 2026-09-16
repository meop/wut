def --env packApt [] {
  let mgr = 'apt'
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
      packOpInfo [$cmd show]
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    outdated => {
      packOpOutdated [$cmd list --upgradable]
    }
    remove => {
      packOpRemove [$cmd purge --autoremove]
    }
    sync => {
      packOpSync [$cmd full-upgrade] [$cmd install]
    }
    tidy => {
      packOp [$cmd clean]
      packOp [$cmd autoremove --purge]
    }
  }
}
