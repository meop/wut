def --env packPnpm [] {
  let cmd = 'pnpm'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| packSearch [$cmd search] $n } [$cmd add -g]
    }
    find => {
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list -g]
    }
    outdated => {
      packOpOutdated [$cmd outdated -g]
    }
    remove => {
      packOpRemove { |n| packInstalled [$cmd list -g] $n } [$cmd remove -g]
    }
    sync => {
      packOpSync [$cmd update -g] [$cmd update -g]
    }
    tidy => {
      packOp [$cmd store prune]
    }
  }
}
