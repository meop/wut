if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt purge $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt purge $WUT_PACKAGES
      fi
    else
      wutLogOp apt purge $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt purge $WUT_PACKAGES
      fi
    fi
    WUT_PACK='apt'
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get purge $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt-get purge $WUT_PACKAGES
      fi
    fi
    WUT_PACK='apt-get'
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew uninstall $WUT_PACKAGES
    if [[ -z "${WUT_NO_RUN}" ]]; then
      brew uninstall $WUT_PACKAGES
    fi
    WUT_PACK='brew'
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf remove $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo dnf remove $WUT_PACKAGES
      fi
    fi
    WUT_PACK='dnf'
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --remove --recursive --nosave $WUT_PACKAGES
    if [[ -z "${WUT_NO_RUN}" ]]; then
      yay --remove --recursive --nosave $WUT_PACKAGES
    fi
    WUT_PACK='yay'
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> del packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --remove --recursive --nosave $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo pacman --remove --recursive --nosave $WUT_PACKAGES
      fi
    else
      wutLogOp pacman --remove --recursive --nosave $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pacman --remove --recursive --nosave $WUT_PACKAGES
      fi
    fi
    WUT_PACK='pacman'
  fi
fi
