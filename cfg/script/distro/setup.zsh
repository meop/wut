function () {
  if [[ ! -e /etc/wsl.conf ]]; then
    opPrintWarn 'wsl.conf is not there'
    return
  fi
  opPrintMaybeRunCmd cat /etc/wsl.conf
}
