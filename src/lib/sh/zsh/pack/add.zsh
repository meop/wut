if type apt > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt update
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt update
      fi
      wutLogOp sudo apt install $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt install $WUT_PACK_NAMES
      fi
    else
      wutLogOp apt update
      if [[ -z "${WUT_NOOP}" ]]; then
        apt update
      fi
      wutLogOp apt install $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        apt install $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='apt'
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get update
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt-get update
      fi
      wutLogOp sudo apt-get install $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt-get install $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='apt-get'
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew update
    if [[ -z "${WUT_NOOP}" ]]; then
      brew update
    fi
    wutLogOp brew install $WUT_PACK_NAMES
    if [[ -z "${WUT_NOOP}" ]]; then
      brew install $WUT_PACK_NAMES
    fi
    WUT_PACK='brew'
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf check-update
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo dnf check-update
      fi
      wutLogOp sudo dnf install $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo dnf install $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='dnf'
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --refresh
    if [[ -z "${WUT_NOOP}" ]]; then
      yay --sync --refresh
    fi
    wutLogOp yay --sync --needed $WUT_PACK_NAMES
    if [[ -z "${WUT_NOOP}" ]]; then
      yay --sync --needed $WUT_PACK_NAMES
    fi
    WUT_PACK='yay'
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> add packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --refresh
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      wutLogOp sudo pacman --sync --needed $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo pacman --sync --needed $WUT_PACK_NAMES
      fi
    else
      wutLogOp pacman --sync --refresh
      if [[ -z "${WUT_NOOP}" ]]; then
        pacman --sync --refresh
      fi
      wutLogOp pacman --sync --needed $WUT_PACK_NAMES
      if [[ -z "${WUT_NOOP}" ]]; then
        pacman --sync --needed $WUT_PACK_NAMES
      fi
    fi
    WUT_PACK='pacman'
  fi
fi
