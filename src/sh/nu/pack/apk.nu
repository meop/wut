def --env packApk [] {
  let mgr = 'apk'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd add]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    outdated => {
      packOpOutdated [$cmd list -u]
    }
    remove => {
      packOpRemove [$cmd del]
    }
    renew => {
      # fix reinstalls what it names
      packOpRenew [$cmd fix]
    }
    sync => {
      packOpSync [$cmd upgrade] [$cmd add]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
