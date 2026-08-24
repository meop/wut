def --env packBrew [] {
  let cmd = 'brew'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'brew')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOp [$cmd update]
      packOpAdd 'brew' $"use brew \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
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
      packOpOutdated [$cmd outdated]
    }
    remove => {
      packOpRemove 'brew' $"use brew \(user\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall]
    }
    sync => {
      packOp [$cmd update]
      packOpSync [$cmd upgrade --greedy] [$cmd upgrade --greedy]
    }
    tidy => {
      packOp [$cmd cleanup --prune=all --scrub]
      packOp [$cmd autoremove]
    }
  }
}
