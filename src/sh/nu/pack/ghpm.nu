def --env packGhpm [] {
  let cmd = 'ghpm'
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
      packOpAdd [$cmd search] [$cmd install]
    }
    'find' => {
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list]
    }
    'out' => {
      packOpOut [$cmd outdated]
    }
    'rem' => {
      packOpRem [$cmd list] [$cmd uninstall]
    }
    'sync' => {
      packOpSync [$cmd update] [$cmd sync]
    }
    'tidy' => {
      packOpTidy [$cmd clean]
    }
  }
}
