def --env packApt [] {
  let cmd = 'apt'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'apt')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'apt' }

  match $env.PACK_OP {
    add => {
      packOpAdd 'apt' $"use apt \(system\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      packOpList [$cmd list --installed]
    }
    outdated => {
      packOpOutdated [$cmd list --upgradable]
    }
    remove => {
      packOpRemove 'apt' $"use apt \(system\)" { |n| packGrepList [$cmd list --installed] $n } [$cmd purge --autoremove]
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
