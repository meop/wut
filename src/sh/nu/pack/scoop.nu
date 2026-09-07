def --env packScoop [] {
  let bin = 'scoop'
  let cmd = (packScoopCmd)
  if (packSkip $bin) {
    return
  }


  packRefreshForOp $bin

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
