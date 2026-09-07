def --env packChoco [] {
  let cmd = 'choco'
  if (packSkip $cmd) {
    return
  }


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
      packOpSync [$cmd upgrade all] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd cache remove]
    }
  }
}
