def --env packScoop [] {
  let bin = 'scoop'
  let cmd = (packScoopCmd)
  if (
    (which $bin | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $bin) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }


  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh $bin }

  match $env.PACK_OP {
    add => {
      packOpAdd ($cmd ++ [install])
    }
    info => {
      packOpInfo ($cmd ++ [info])
    }
    list => {
      packOpList (packListCmd 'scoop')
    }
    outdated => {
      packOpOutdated ($cmd ++ [status])
    }
    remove => {
      packOpRemove ($cmd ++ [uninstall --purge])
    }
    sync => {
      packOpSync ($cmd ++ [update --all]) ($cmd ++ [update])
    }
    tidy => {
      packOp ($cmd ++ [cache rm --all])
      packOp ($cmd ++ [cleanup --all])
    }
  }
}
