function () {
  if ! type docker > /dev/null; then
    opPrintWarn 'docker is not installed'
    return
  fi
  if ! opAsk 'teardown - docker - disable service (system)'; then
    return
  fi
  opPrintMaybeRunCmd sudo systemctl disable --now docker
}
