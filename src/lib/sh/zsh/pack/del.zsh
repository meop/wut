if type apt > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt purge $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt purge $WUT_PACK_NAMES
      fi
    else
      wutLogOp apt purge $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        apt purge $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='apt'
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get purge $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt-get purge $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='apt-get'
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew uninstall $WUT_PACK_NAMES
    if [[ -z "${WUT_NOOP}" ]]; then
      brew uninstall $WUT_PACK_NAMES
    fi
    WUT_PACK='brew'
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf remove $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo dnf remove $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='dnf'
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --remove --recursive --nosave $WUT_PACK_NAMES
    if [[ -z "${WUT_NOOP}" ]]; then
      yay --remove --recursive --nosave $WUT_PACK_NAMES
    fi
    WUT_PACK='yay'
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> del packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --remove --recursive --nosave $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo pacman --remove --recursive --nosave $WUT_PACK_NAMES
      fi
    else
      wutLogOp pacman --remove --recursive --nosave $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        pacman --remove --recursive --nosave $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='pacman'
  fi
fi
