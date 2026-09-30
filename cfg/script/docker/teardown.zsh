function () {
  if ! type docker > /dev/null; then
    opPrintWarn 'docker is not installed'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn=y
  else
    read 'yn?teardown - docker - disable service (system) [y,[n]]: '
  fi
  if [[ -n $yn && ${(L)yn} != y && ${(L)yn} != yes ]]; then
    return
  fi
  opPrintMaybeRunCmd sudo systemctl disable --now docker
}
