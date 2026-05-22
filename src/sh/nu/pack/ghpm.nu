def --env packGhpm [] {
  let cmd = 'ghpm'
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
      packOp [$cmd refresh]
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd install]
    }
    'find' => {
      packOp [$cmd refresh]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list]
    }
    'outdated' => {
      packOpOutdated [$cmd outdated]
    }
    'remove' => {
      packOpRemove { |n| packInstalled [$cmd list] $n } [$cmd uninstall]
    }
    'sync' => {
      packOpSync [$cmd sync] [$cmd sync]
    }
    'tidy' => {
      packOp [$cmd tidy]
    }
  }
}
