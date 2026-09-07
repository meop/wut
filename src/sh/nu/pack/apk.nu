def --env packApk [] {
  let cmd = 'apk'
  if (packSkip $cmd) {
    return
  }

  let cmd = packElevate $cmd

  packRefreshForOp 'apk'

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd add]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd list -u]
    }
    remove => {
      packOpRemove [$cmd del]
    }
    sync => {
      packOpSync [$cmd upgrade] [$cmd add]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
