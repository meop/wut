& {
  if (-not $IsWindows) {
    opPrintWarn 'script is for winnt'
    return
  }
  if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    opPrintWarn 'cargo is not installed'
    return
  }
  $yn = ''
  if ($YES) {
    $yn = 'y'
  } else {
    $yn = Read-Host '? setup rust - install cargo tools [y, [n]]'
  }
  if ($yn -ne 'n') {
    $url = 'https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.ps1'
    opPrintMaybeRunCmd irm -ErrorAction Stop -ProgressAction SilentlyContinue -Uri $url '|' iex
    opPrintMaybeRunCmd cargo binstall cargo-cache
    opPrintMaybeRunCmd cargo binstall cargo-update
  }
}
