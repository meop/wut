def --env packZypper [] {
  let mgr = 'zypper'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    outdated => {
      packOpOutdated [$cmd list-updates]
    }
    remove => {
      # same reason as list, above: search --installed-only isn't reliable
      packOpRemove [$cmd uninstall]
    }
    renew => {
      packOpRenew [$cmd install --force]
    }
    sync => {
      packOpSync [$cmd update] [$cmd install]
    }
    tidy => {
      # --unneeded is what the other managers call orphans. zypper's --orphaned is what no repo offers: everything
      # installed, when its repos fail to load, and it still exits 0
      let pkgs = (run-external 'zypper' '--quiet' '--disable-repositories' 'packages' '--unneeded'
        | lines
        | where { |l| ($l | str trim | str starts-with 'i') }
        | each { |l| $l | split row '|' | get 2 | str trim }
        | where { |n| ($n | is-not-empty) })
      if ($pkgs | is-not-empty) {
        packOp ([$cmd remove --clean-deps] ++ $pkgs)
      }
      packOp [$cmd clean --all]
    }
  }
}
