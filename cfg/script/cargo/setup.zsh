function () {
  if [[ $SYS_OS_PLAT != darwin && $SYS_OS_PLAT != linux ]]; then
    opPrintWarn 'script is for darwin or linux'
    return
  fi
  if ! type cargo > /dev/null; then
    opPrintWarn 'cargo is not installed'
    return
  fi
  if ! opAsk 'setup - cargo - install tools (user)'; then
    return
  fi
  local url='https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh'
  opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" '|' bash
  opPrintMaybeRunCmd cargo binstall cargo-cache
  opPrintMaybeRunCmd cargo binstall cargo-update
}
