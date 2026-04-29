def --env packWinget [] {
  let cmd = 'winget'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'rem' and ($env.PACK_REM_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user/system\)") { return }

  match $env.PACK_OP {
    'add' => {
      packOpUp [$cmd source update]
      packOpAdd [$cmd search --id] [$cmd install]
    }
    'find' => {
      packOpUp [$cmd source update]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list]
    }
    'out' => {
      packOpUp [$cmd source update]
      packOpOut [$cmd upgrade]
    }
    'rem' => {
      packOpRem [$cmd list] [$cmd uninstall]
    }
    'sync' => {
      packOpUp [$cmd source update]
      packOpSync [$cmd upgrade --all] [$cmd upgrade]
    }
  }
}
