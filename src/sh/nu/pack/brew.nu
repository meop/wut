def --env packBrew [] {
  let cmd = 'brew'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'remove' and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    'add' => {
      packOp [$cmd update]
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd install]
    }
    'find' => {
      packOp [$cmd update]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list]
    }
    'outdated' => {
      packOp [$cmd update]
      packOpOutdated [$cmd outdated]
    }
    'remove' => {
      packOpRemove { |n| packInstalled [$cmd list] $n } [$cmd uninstall]
    }
    'sync' => {
      packOp [$cmd update]
      packOpSync [$cmd upgrade --greedy] [$cmd upgrade --greedy]
    }
    'tidy' => {
      opPrintMaybeRunCmd $cmd cleanup --prune=all --scrub
      opPrintMaybeRunCmd $cmd autoremove
    }
  }
}
