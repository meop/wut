def --env packWinget [] {
  let cmd = 'winget'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'winget')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user/system\)") { return }

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'winget' }

  match $env.PACK_OP {
    add => {
      packOpAdd 'winget' $"use winget \(user/system\)" { |n| packGrepFind [$cmd search --id] $n } [$cmd install] --each
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOpOutdated [$cmd upgrade]
    }
    remove => {
      packOpRemove 'winget' $"use winget \(user/system\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall] --each
    }
    sync => {
      packOpSync [$cmd upgrade --all] [$cmd upgrade] --each
    }
  }
}
