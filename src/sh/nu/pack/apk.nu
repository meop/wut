def --env packApk [] {
  let cmd = 'apk'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }

  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'apk' }

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd add]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd list -u]
    }
    remove => {
      packOpRemove [$cmd del]
    }
    sync => {
      packOpSync [$cmd upgrade] [$cmd add]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
