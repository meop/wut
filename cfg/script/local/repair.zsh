function () {
  if [[ $SSH_CONNECTION ]]; then
    opPrintWarn 'script cannot run over ssh'
    return
  fi
  opPrintMaybeRunCmd loginctl list-sessions
}
