def --env packChoco [] {
  let cmd = 'choco'
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
      packOpSync [$cmd upgrade all] [$cmd upgrade]
    }
    'tidy' => {
      opPrintMaybeRunCmd $cmd cache remove
      let orphans = (glob 'C:\ProgramData\chocolatey\lib\**\*.nuspec' | where { |f|
        (open --raw $f | str contains '<dependency') == false
      } | each { |f| $f | path basename | str replace '.nuspec' '' })
      if ($orphans | is-not-empty) {
        opPrintMaybeRunCmd $cmd uninstall $orphans --force-dependencies
      }
    }
  }
}
