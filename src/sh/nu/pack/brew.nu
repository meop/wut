def --env packBrew [] {
  let cmd = 'brew'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }


  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'brew' }

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
      packOpSync [$cmd upgrade --greedy] [$cmd upgrade --greedy]
    }
    tidy => {
      packOp [$cmd cleanup --prune=all --scrub]
      packOp [$cmd autoremove]
    }
  }
}
