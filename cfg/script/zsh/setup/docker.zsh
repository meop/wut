function () {
  if ! type docker > /dev/null; then
    opPrintWarn 'docker is not installed'
    return
  fi
  opPrintInfo 'setup docker via zsh'
}
