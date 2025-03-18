if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt update
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt install $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt install $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt full-upgrade
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt full-upgrade
        fi
      fi
    else
      wutLogOp apt update
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp apt install $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt install $WUT_PACKAGES
        fi
      else
        wutLogOp apt full-upgrade
        if [[ -z "${WUT_NO_RUN}" ]]; then
          apt full-upgrade
        fi
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get update
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt-get update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo apt-get install $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get install $WUT_PACKAGES
        fi
      else
        wutLogOp sudo apt-get dist-upgrade
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo apt-get dist-upgrade
        fi
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew update
    if [[ -z "${WUT_NO_RUN}" ]]; then
      brew update
    fi
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp brew upgrade --greedy $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew upgrade --greedy $WUT_PACKAGES
      fi
    else
      wutLogOp brew upgrade --greedy
      if [[ -z "${WUT_NO_RUN}" ]]; then
        brew upgrade --greedy
      fi
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf check-update
      if [[ "${WUT_PACKAGES}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo dnf upgrade $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf upgrade $WUT_PACKAGES
        fi
      else
        wutLogOp sudo dnf distro-sync
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo dnf distro-sync
        fi
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --refresh
    if [[ -z "${WUT_NO_RUN}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${WUT_PACKAGES}" ]]; then
      wutLogOp yay --sync --needed $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --sync --needed $WUT_PACKAGES
      fi
    else
      wutLogOp yay --sync --sysupgrade
      if [[ -z "${WUT_NO_RUN}" ]]; then
        yay --sync --sysupgrade
      fi
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> up packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --refresh
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp sudo pacman --sync --needed $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --sync --needed $WUT_PACKAGES
        fi
      else
        wutLogOp sudo pacman --sync --sysupgrade
        if [[ -z "${WUT_NO_RUN}" ]]; then
          sudo pacman --sync --sysupgrade
        fi
      fi
    else
      wutLogOp pacman --sync --refresh
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${WUT_PACKAGES}" ]]; then
        wutLogOp pacman --sync --needed $WUT_PACKAGES
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --sync --needed $WUT_PACKAGES
        fi
      else
        wutLogOp pacman --sync --sysupgrade
        if [[ -z "${WUT_NO_RUN}" ]]; then
          pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
fi
