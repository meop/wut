def --env packScoop [] {
  let cmd = 'scoop'
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
      packOpUp [$cmd update]
      packOpAdd [$cmd search] [$cmd install]
    }
    'find' => {
      packOpUp [$cmd update]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list]
    }
    'out' => {
      packOpUp [$cmd update]
      packOpOut [$cmd status]
    }
    'rem' => {
      packOpRem [$cmd list] [$cmd uninstall --purge]
    }
    'sync' => {
      packOpUp [$cmd update]
      packOpSync [$cmd update --all] [$cmd update]
    }
    'tidy' => {
      packOpTidy [$cmd cleanup --all --cache]
    }
  }
}
