def --env packZypper [] {
  let cmd = 'zypper'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'remove' and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packSudoCmd $cmd

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
      packOpList [$cmd search --installed-only]
    }
    'outdated' => {
      packOp [$cmd refresh]
      packOpOutdated [$cmd list-updates]
    }
    'remove' => {
      packOpRemove { |n| packInstalled [$cmd search --installed-only] $n } [$cmd uninstall]
    }
    'sync' => {
      packOp [$cmd refresh]
      packOpSync [$cmd update] [$cmd install]
    }
    'tidy' => {
      opPrintMaybeRunCmd $cmd clean --all
      for flag in ['--unneeded', '--orphaned'] {
        let pkgs = (run-external 'zypper' 'packages' $flag
          | lines
          | where { |l| ($l | str trim | str starts-with 'i') }
          | each { |l| $l | split row '|' | get 2 | str trim }
          | where { |n| ($n | is-not-empty) })
        if ($pkgs | is-not-empty) {
          opPrintMaybeRunCmd $cmd remove --clean-deps $pkgs
        }
      }
    }
  }
}
