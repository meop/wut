def --env packBrew [] {
  let cmd = 'brew'
  if (packSkip $cmd) {
    return
  }


  packRefreshForOp 'brew'

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
      packOpOutdated [$cmd outdated]
    }
    remove => {
      packOpRemove [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd upgrade --greedy] [$cmd upgrade --greedy]
    }
    tidy => {
      packOp [$cmd cleanup --prune=all --scrub]
      packOp [$cmd autoremove]
    }
  }
}
