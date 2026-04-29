def --env packApk [] {
  let cmd = 'apk'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'rem' and ($env.PACK_REM_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packSudoCmd $cmd

  match $env.PACK_OP {
    'add' => {
      packOpUp [$cmd update]
      packOpAdd [$cmd search] [$cmd add]
    }
    'find' => {
      packOpUp [$cmd update]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list --installed]
    }
    'out' => {
      packOpUp [$cmd update]
      packOpOut [$cmd list -u]
    }
    'rem' => {
      packOpRem [$cmd list --installed] [$cmd del]
    }
    'sync' => {
      packOpUp [$cmd update]
      packOpSync [$cmd upgrade] [$cmd add]
    }
    'tidy' => {
      packOpTidy [$cmd cache clean]
    }
  }
}
