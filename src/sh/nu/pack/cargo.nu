def --env packCargo [] {
  let cmd = 'cargo'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
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
