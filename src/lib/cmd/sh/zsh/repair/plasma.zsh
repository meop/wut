# note: plasma has a long-time bug with multiple panels
# where the keyboard shortcut keys get conflicted when saved
# so a panel specific shortcut like Meta key, which is usually tied to Alt-F1
# and is supposed to open the Start Menu, ends up opening on the new panel after reboot
# often this is undesired
# the only workaround to reset this behavior is to start over by erasing these
# files and setting up new panels
if [[ -f "${HOME}/.config/globalshortcutsrc" ]]; then
  echo -n '> repair plasma global shortcuts [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp rm "${HOME}/.config/globalshortcutsrc"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      rm "${HOME}/.config/kglobalshortcutsrc"
    fi
  fi
fi
if [[ -f "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc" ]]; then
  echo -n '> repair plasma panel applets [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp rm "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      rm "${HOME}/.config/plasma-org.kde.plasma.desktop-appletsrc"
    fi
  fi
fi
