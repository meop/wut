if type apt > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with apt [system]? (y/N) '
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
      wutLogOp sudo apt install $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt install $WUT_PACKAGES
      fi
    else
      wutLogOp apt update
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt update
      fi
      wutLogOp apt install $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        apt install $WUT_PACKAGES
      fi
    fi
    WUT_PACK='apt'
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with apt-get [system]? (y/N) '
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
      wutLogOp sudo apt-get install $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo apt-get install $WUT_PACKAGES
      fi
    fi
    WUT_PACK='apt-get'
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with brew [system]? (y/N) '
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
    wutLogOp brew install $WUT_PACKAGES
    if [[ -z "${WUT_NO_RUN}" ]]; then
      brew install $WUT_PACKAGES
    fi
    WUT_PACK='brew'
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf check-update
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo dnf check-update
      fi
      wutLogOp sudo dnf install $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo dnf install $WUT_PACKAGES
      fi
    fi
    WUT_PACK='dnf'
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with yay [system]? (y/N) '
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
    wutLogOp yay --sync --needed $WUT_PACKAGES
    if [[ -z "${WUT_NO_RUN}" ]]; then
      yay --sync --needed $WUT_PACKAGES
    fi
    WUT_PACK='yay'
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK}" ]]; then
    echo -n '> add packages with pacman [system]? (y/N) '
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
      wutLogOp sudo pacman --sync --needed $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        sudo pacman --sync --needed $WUT_PACKAGES
      fi
    else
      wutLogOp pacman --sync --refresh
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pacman --sync --refresh
      fi
      wutLogOp pacman --sync --needed $WUT_PACKAGES
      if [[ -z "${WUT_NO_RUN}" ]]; then
        pacman --sync --needed $WUT_PACKAGES
      fi
    fi
    WUT_PACK='pacman'
  fi
fi
