if type apt > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with apt [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt autoclean
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt autoclean
      fi
      wutLogOp sudo apt autoremove
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt autoremove
      fi
    else
      wutLogOp apt autoclean
      if [[ -z "${WUT_NOOP}" ]]; then
        apt autoclean
      fi
      wutLogOp apt autoremove
      if [[ -z "${WUT_NOOP}" ]]; then
        apt autoremove
      fi
    fi
  fi
elif type apt-get > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with apt-get [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'apt-get' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo apt-get autoclean
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt-get autoclean
      fi
      wutLogOp sudo apt-get autoremove
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt-get autoremove
      fi
    fi
  fi
fi

if type brew > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with brew [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'brew' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp brew cleanup --prune=all
    if [[ -z "${WUT_NOOP}" ]]; then
      brew cleanup --prune=all
    fi
  fi
fi

if type dnf > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with dnf [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'dnf' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo dnf clean dbcache
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo dnf clean dbcache
      fi
      wutLogOp sudo dnf autoremove
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo dnf autoremove
      fi
    fi
  fi
fi

if type yay > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with yay [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'yay' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    wutLogOp yay --sync --clean
    if [[ -z "${WUT_NOOP}" ]]; then
      yay --sync --clean
    fi
  fi
elif type pacman > /dev/null; then
  if [[ -z "${WUT_PACK_MANAGER}" ]]; then
    echo -n '> tidy packages with pacman [system]? (y/N) '
    read yn
  elif [[ "${WUT_PACK_MANAGER}" == 'pacman' ]]; then
    yn='y'
  else
    yn='n'
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      wutLogOp sudo pacman --sync --clean
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo pacman --sync --clean
      fi
    else
      wutLogOp pacman --sync --clean
      if [[ -z "${WUT_NOOP}" ]]; then
        pacman --sync --clean
      fi
    fi
  fi
fi
