def --env packPnpm [] {
  let cmd = 'pnpm'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'rem' and ($env.PACK_REM_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    'add' => {
      packOpAdd [$cmd search] [$cmd add -g]
    }
    'find' => {
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list -g]
    }
    'out' => {
      packOpOut [$cmd outdated -g]
    }
    'rem' => {
      packOpRem [$cmd list -g] [$cmd remove -g]
    }
    'sync' => {
      packOpSync [$cmd update -g] [$cmd update -g]
    }
    'tidy' => {
      packOpTidy [$cmd store prune]
    }
  }
}
