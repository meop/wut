function () {
  if [[ $SYS_OS_PLAT != 'linux' ]]; then
    opPrintWarn 'script is for linux'
    return
  fi
  if ! type docker > /dev/null; then
    opPrintWarn 'docker is not installed'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? setup docker - enable service [y, [n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  opPrintMaybeRunCmd sudo systemctl enable --now docker
}
