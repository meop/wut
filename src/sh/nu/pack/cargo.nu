def --env packCargo [] {
  let cmd = 'cargo'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd binstall --locked]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd install-update --list]
    }
    remove => {
      packOpRemove [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd install-update --all] [$cmd install-update]
    }
    tidy => {
      packOp [$cmd cache --autoclean]
    }
  }
}
