def --env packWinget [] {
  let cmd = 'winget'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }


  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'winget' }

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
