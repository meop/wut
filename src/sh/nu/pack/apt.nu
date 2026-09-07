def --env packApt [] {
  let cmd = 'apt'
  if (packSkip $cmd) {
    return
  }

  let cmd = packElevate $cmd

  packRefreshForOp 'apt'

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      packOpList (packListCmd $cmd)
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
