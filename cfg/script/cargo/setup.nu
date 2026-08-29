do {
  if $env.SYS_OS_PLAT not-in ['darwin' 'linux' 'windows'] {
    opPrintWarn 'script is for darwin, linux, or windows'
    return
  }
  if not (which cargo | is-not-empty) {
    opPrintWarn 'cargo is not installed'
    return
  }
  mut yn = ''
  if 'YES' in $env {
    $yn = 'y'
  } else {
    $yn = input 'setup - cargo - install tools (user) [y,[n]]: '
  }
  if $yn == 'n' {
    return
  }
  if $env.SYS_OS_PLAT == 'windows' {
    opPrintMaybeRunCmd powershell -NoProfile -Command $"'irm -ErrorAction Stop -ProgressAction SilentlyContinue -Uri https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.ps1 | iex'"
  } else {
    opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh '|' bash
  }
  opPrintMaybeRunCmd cargo binstall cargo-cache
  opPrintMaybeRunCmd cargo binstall cargo-update
}
