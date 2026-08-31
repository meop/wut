def --env packChoco [] {
  let cmd = 'choco'
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
