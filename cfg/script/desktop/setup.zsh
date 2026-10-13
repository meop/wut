function () {
  if [[ $SYS_OS_DE != gnome ]]; then
    opPrintWarn 'script is for gnome desktop environment'
    return
  fi
  opPrintMaybeRunCmd gsettings list-schemas
}
