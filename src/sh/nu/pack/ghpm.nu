def --env packGhpm [] {
  let cmd = 'ghpm'
  if (packSkip $cmd) {
    return
  }


  if $env.PACK_OP in ['add', 'sync'] { packRefresh 'ghpm' }

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
    renew => {
      packOpRenew [$cmd renew]
    }
    sync => {
      packOpSync [$cmd sync] [$cmd sync]
    }
    tidy => {
      packOp [$cmd tidy]
    }
  }
}
