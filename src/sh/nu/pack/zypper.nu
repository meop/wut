def --env packZypper [] {
  let cmd = 'zypper'
  if (packSkip $cmd) {
    return
  }

  let cmd = packElevate $cmd

  packRefreshForOp 'zypper'

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd list-updates]
    }
    remove => {
      # same reason as list, above: search --installed-only isn't reliable
      packOpRemove [$cmd uninstall]
    }
    sync => {
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
