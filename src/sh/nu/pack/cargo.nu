# rustup manages toolchains rather than packages, and cargo on PATH is usually its proxy — a link to the rustup
# beside it, a hard link on windows — so the real cargo lives in a toolchain only `rustup update` moves. the
# toolchains update before the crates rebuild against them. a distro cargo has no rustup beside it, and is its package
# manager's to update
def --env packRustupUpdate [] {
  let cargo = (which cargo | get -o 0.path)
  if $cargo == null {
    return
  }
  let ext = if $nu.os-info.name == 'windows' { '.exe' } else { '' }
  let rustup = ($cargo | path expand | path dirname | path join $"rustup($ext)")
  if ($rustup | path exists) {
    packSelfUpdate 'rustup' $rustup [update]
  }
}

def --env packCargo [] {
  let cmd = 'cargo'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd binstall --locked]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd install-update --list]
    }
    remove => {
      packOpRemove [$cmd uninstall]
    }
    sync => {
      if ((packNameList 'PACK_SYNC_NAMES') | is-empty) {
        packRustupUpdate
      }
      packOpSync [$cmd install-update --all] [$cmd install-update]
    }
    tidy => {
      packOp [$cmd cache --autoclean]
    }
  }
}
