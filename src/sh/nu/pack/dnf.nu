def --env packDnf [] {
  let cmd = 'dnf'
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
      packOpUp [$cmd makecache]
      packOpAdd [$cmd search] [$cmd install]
    }
    'find' => {
      packOpUp [$cmd makecache]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd list --installed]
    }
    'out' => {
      packOpUp [$cmd makecache]
      packOpOut [$cmd list --upgrades]
    }
    'rem' => {
      packOpRem [$cmd list --installed] [$cmd remove]
    }
    'sync' => {
      packOpUp [$cmd makecache]
      packOpSync [$cmd distro-sync] [$cmd upgrade]
    }
    'tidy' => {
      opPrintMaybeRunCmd $cmd clean all
      opPrintMaybeRunCmd $cmd autoremove
    }
  }
}
