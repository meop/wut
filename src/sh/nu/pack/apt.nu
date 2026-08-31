def --env packApt [] {
  let cmd = 'apt'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }

  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'apt' }

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd list --upgradable]
    }
    remove => {
      packOpRemove [$cmd purge --autoremove]
    }
    sync => {
      packOpSync [$cmd full-upgrade] [$cmd install]
    }
    tidy => {
      packOp [$cmd clean]
      packOp [$cmd autoremove --purge]
    }
  }
}
