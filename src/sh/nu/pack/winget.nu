def --env packWinget [] {
  let cmd = 'winget'
  if (packSkip $cmd) {
    return
  }


  packRefreshForOp 'winget'

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install] --each
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd upgrade]
    }
    remove => {
      packOpRemove [$cmd uninstall] --each
    }
    sync => {
      packOpSync [$cmd upgrade --all] [$cmd upgrade] --each
    }
  }
}
