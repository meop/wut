# rustup manages toolchains rather than packages, and cargo on PATH is usually its proxy — a link to the rustup
# beside it, a hard link on windows — so the real cargo lives in a toolchain only `rustup update` moves. the
# toolchains update before the crates rebuild against them. a distro cargo has no rustup beside it, and is its package
# manager's to update
def packRustupPath [] {
  let cargo = (which cargo | get -o 0.path)
  if $cargo == null {
    return null
  }
  let ext = if $nu.os-info.name == 'windows' { '.exe' } else { '' }
  let rustup = ($cargo | path expand | path dirname | path join $"rustup($ext)")
  if ($rustup | path exists) { $rustup } else { null }
}

def --env packRustupUpdate [] {
  let rustup = (packRustupPath)
  if $rustup != null {
    packSelfUpdate 'rustup' $rustup [update]
  }
}

# rustup keeps every toolchain it installs. one pinned to a version is one a project's rust-toolchain.toml asked for,
# and rustup installs it again when that project next builds (1.28.1+), so tidy lets those go. the channels stay, and
# so does any toolchain rustup marks as the default or the active one
def --env packRustupTidy [] {
  let rustup = (packRustupPath)
  if $rustup == null {
    return
  }
  let pinned = (
    ^$rustup toolchain list | complete | get stdout | lines
      | where { |l| ($l =~ '^\d+\.\d+') and not ($l =~ '\(') }
      | each { |l| $l | str trim }
  )
  for toolchain in $pinned {
    packOp [$rustup toolchain uninstall $toolchain]
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
      packRustupTidy
      packOp [$cmd cache --autoclean]
    }
  }
}
