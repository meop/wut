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

# cargo, rustc and rustup are one install: rustup's proxies side by side, or a distro's cargo and rustc. a rustc PATH
# finds anywhere else builds everything this cargo installs, and a rustup with no default toolchain leaves its cargo
# nothing to run. compared by the directory each resolves into, since a proxy can be a link to rustup itself
def --env packCargoHeld [] {
  let cargo = (which cargo | get -o 0.path)
  let rustc = (which rustc | get -o 0.path)
  if $rustc == null {
    return (packHeld '' 'no rustc on PATH' [$"cargo ($cargo)"])
  }
  if ($rustc | path expand | path dirname) != ($cargo | path expand | path dirname) {
    return (packHeld '' "rustc is another install's" [$"cargo ($cargo)" $"rustc ($rustc)"])
  }
  let rustup = (packRustupPath)
  let rustupFound = (which rustup | get -o 0.path)
  if $rustup != null and $rustupFound != null and ($rustupFound | path expand) != ($rustup | path expand) {
    return (packHeld '' "rustup is another install's" [$"cargo ($cargo)" $"rustup ($rustupFound)"])
  }
  # the rustc PATH finds is the one beside cargo, so it is asked by name, as it is shown
  let res = (packAsk [rustc --version] --home)
  if $res.exit_code == null {
    return (packHeld '' 'rustc does not start' [$"rustc ($rustc)" $res.stderr])
  }
  if $res.exit_code != 0 {
    if $rustup != null {
      return (packHeld '' 'rustup has no default toolchain' ['rustup default stable'])
    }
    return (packHeld '' 'rustc does not run' [$"rustc ($rustc)"])
  }
  let by = if $rustup != null { ' (rustup)' } else { '' }
  packHeld $"rust (packVersionOf $res.stdout)($by)"
}

def --env packRustupUpdate [] {
  let rustup = (packRustupPath)
  if $rustup != null {
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
