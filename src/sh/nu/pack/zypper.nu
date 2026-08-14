def --env packZypper [] {
  let cmd = 'zypper'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  match $env.PACK_OP {
    add => {
      packOp [$cmd refresh]
      packOpAdd { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd refresh]
      packOpFind [$cmd search]
    }
    info => {
      packOp [$cmd refresh]
      packOpInfo [$cmd info]
    }
    list => {
      # not `search --installed-only`: it can report packages as installed
      # when they aren't — https://github.com/openSUSE/zypper/issues/498
      packOpList [$cmd packages --installed-only]
    }
    outdated => {
      packOp [$cmd refresh]
      packOpOutdated [$cmd list-updates]
    }
    remove => {
      # same reason as list, above: search --installed-only isn't reliable
      packOpRemove { |n| packGrepList [$cmd packages --installed-only] $n } [$cmd uninstall]
    }
    sync => {
      packOp [$cmd refresh]
      packOpSync [$cmd update] [$cmd install]
    }
    tidy => {
      packOp [$cmd clean --all]
      for flag in ['--unneeded', '--orphaned'] {
        let pkgs = (run-external 'zypper' 'packages' $flag
          | lines
          | where { |l| ($l | str trim | str starts-with 'i') }
          | each { |l| $l | split row '|' | get 2 | str trim }
          | where { |n| ($n | is-not-empty) })
        if ($pkgs | is-not-empty) {
          packOp ([$cmd remove --clean-deps] ++ $pkgs)
        }
      }
    }
  }
}
