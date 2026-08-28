def --env packApk [] {
  let cmd = 'apk'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'apk')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'apk' }

  match $env.PACK_OP {
    add => {
      packOpAdd 'apk' $"use apk \(system\)" { |n| packGrepFind [$cmd search] $n } [$cmd add]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list --installed]
    }
    outdated => {
      packOpOutdated [$cmd list -u]
    }
    remove => {
      packOpRemove 'apk' $"use apk \(system\)" { |n| packGrepList [$cmd list --installed] $n } [$cmd del]
    }
    sync => {
      packOpSync [$cmd upgrade] [$cmd add]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
