def --env packZypper [] {
  let cmd = 'zypper'
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
      packOpUp [$cmd refresh]
      packOpAdd [$cmd search] [$cmd install]
    }
    'find' => {
      packOpUp [$cmd refresh]
      packOpFind [$cmd search]
    }
    'list' => {
      packOpList [$cmd search --installed-only]
    }
    'out' => {
      packOpUp [$cmd refresh]
      packOpOut [$cmd list-updates]
    }
    'rem' => {
      packOpRem [$cmd search --installed-only] [$cmd uninstall]
    }
    'sync' => {
      packOpUp [$cmd refresh]
      packOpSync [$cmd update] [$cmd install]
    }
    'tidy' => {
      opPrintMaybeRunCmd $cmd clean --all
      let orphans = (run-external 'zypper' 'packages' '--orphaned'
        | lines
        | where { |l| ($l | str trim | str starts-with 'i') }
        | each { |l| $l | split row '|' | get 2 | str trim }
        | where { |n| ($n | is-not-empty) })
      if ($orphans | is-not-empty) {
        opPrintMaybeRunCmd $cmd remove --clean-deps $orphans
      }
    }
  }
}
