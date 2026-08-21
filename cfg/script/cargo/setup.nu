do {
  if not (which cargo | is-not-empty) {
    opPrintWarn 'cargo is not installed'
    return
  }
  mut yn = ''
  if 'YES' in $env {
    $yn = 'y'
  } else {
    $yn = input 'setup cargo - install tools (user) [y,[n]]: '
  }
  if $yn != 'n' {
    opPrintMaybeRunCmd cargo binstall cargo-cache
    opPrintMaybeRunCmd cargo binstall cargo-nextest
    opPrintMaybeRunCmd cargo binstall cargo-update
  }
}
