def --env packDnf [] {
  let cmd = 'dnf'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }

  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'dnf' }

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
      packOpOutdated [$cmd list --upgrades]
    }
    remove => {
      packOpRemove [$cmd remove]
    }
    sync => {
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd clean all]
      packOp [$cmd autoremove]
    }
  }
}
