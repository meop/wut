function () {
  if ! type cargo > /dev/null; then
    opPrintWarn 'cargo is not installed'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? setup rust - install cargo tools [y, [n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  local url='https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh'
  opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" '|' bash
  opPrintMaybeRunCmd cargo binstall cargo-cache
  opPrintMaybeRunCmd cargo binstall cargo-update
}
