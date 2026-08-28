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

  match $env.PACK_OP {
    add => {
      packOp [$cmd source update]
      packOpAdd 'winget' $"use winget \(user/system\)" { |n| packGrepFind [$cmd search --id] $n } [$cmd install] --each
    }
    info => {
      packOp [$cmd source update]
      packOpInfo [$cmd show]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOp [$cmd source update]
      packOpOutdated [$cmd upgrade]
    }
    remove => {
      packOpRemove 'winget' $"use winget \(user/system\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall] --each
    }
    sync => {
      packOp [$cmd source update]
      packOpSync [$cmd upgrade --all] [$cmd upgrade] --each
    }
  }
}
