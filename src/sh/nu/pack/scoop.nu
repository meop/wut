def --env packScoop [] {
  let cmd = 'scoop'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'scoop')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOp [$cmd update]
      packOpAdd 'scoop' $"use scoop \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd update]
      packOpFind [$cmd search]
    }
    info => {
      packOp [$cmd update]
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOp [$cmd update]
      packOpOutdated [$cmd status]
    }
    remove => {
      packOpRemove 'scoop' $"use scoop \(user\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall --purge]
    }
    sync => {
      packOp [$cmd update]
      packOpSync [$cmd update --all] [$cmd update]
    }
    tidy => {
      packOp [$cmd cache rm --all]
      packOp [$cmd cleanup --all]
    }
  }
}
