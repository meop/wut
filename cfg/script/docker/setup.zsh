function () {
  if ! type docker > /dev/null; then
    opPrintWarn 'docker is not installed'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn=y
  else
    read 'yn?setup - docker - enable service (system) [y,[n]]: '
  fi
  if [[ -n $yn && ${(L)yn} != y && ${(L)yn} != yes ]]; then
    return
  fi
  opPrintMaybeRunCmd sudo systemctl enable --now docker
}
