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

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'brew' }

  match $env.PACK_OP {
    add => {
      packOpAdd 'brew' $"use brew \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOpOutdated [$cmd outdated]
    }
    remove => {
      packOpRemove 'brew' $"use brew \(user\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall]
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
