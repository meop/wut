# note: plasma has a long-time bug with multiple panels
# where the keyboard shortcut keys get conflicted when saved
# so a panel specific shortcut like Meta key, which is usually tied to Alt-F1
# and is supposed to open the Start Menu, ends up opening on the new panel after reboot
# often this is undesired
# the only workaround to reset this behavior is to start over by erasing these
# files and setting up new panels
if [[ -f "${HOME}/.config/globalshortcutsrc" ]]; then
  read yn?'? repair plasma global shortcuts [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    printOp rm "${HOME}/.config/globalshortcutsrc"
    if [[ -z "${NOOP}" ]]; then
      rm "${HOME}/.config/kglobalshortcutsrc"
    fi
  fi
fi
if [[ -f "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc" ]]; then
  read yn?'? repair plasma panel applets [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    printOp rm "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc"
    if [[ -z "${NOOP}" ]]; then
      rm "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc"
    fi
  fi
fi
