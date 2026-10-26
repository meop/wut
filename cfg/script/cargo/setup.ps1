& {
  if (-not $IsWindows) {
    opPrintWarn 'script is for windows'
    return
  }
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    opPrintWarn 'cargo is not installed'
    return
  }
  if (-not (opAsk 'setup - cargo - install tools (user)')) {
    return
  }
  $url = 'https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.ps1'
  opPrintMaybeRunCmd irm -ErrorAction Stop -ProgressAction SilentlyContinue -Uri $url '|' iex
  opPrintMaybeRunCmd cargo binstall cargo-cache
  opPrintMaybeRunCmd cargo binstall cargo-update
}
