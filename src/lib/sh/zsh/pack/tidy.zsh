if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt autoclean
      if [[ -z "${NOOP}" ]]; then
        sudo apt autoclean
      fi
      logOp sudo apt autoremove
      if [[ -z "${NOOP}" ]]; then
        sudo apt autoremove
      fi
    else
      logOp apt autoclean
      if [[ -z "${NOOP}" ]]; then
        apt autoclean
      fi
      logOp apt autoremove
      if [[ -z "${NOOP}" ]]; then
        apt autoremove
      fi
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt-get autoclean
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get autoclean
      fi
      logOp sudo apt-get autoremove
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get autoremove
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    logOp brew cleanup --prune=all
    if [[ -z "${NOOP}" ]]; then
      brew cleanup --prune=all
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo dnf clean dbcache
      if [[ -z "${NOOP}" ]]; then
        sudo dnf clean dbcache
      fi
      logOp sudo dnf autoremove
      if [[ -z "${NOOP}" ]]; then
        sudo dnf autoremove
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    logOp yay --sync --clean
    if [[ -z "${NOOP}" ]]; then
      yay --sync --clean
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> tidy packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo pacman --sync --clean
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --clean
      fi
    else
      logOp pacman --sync --clean
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --clean
      fi
    fi
  fi
fi
