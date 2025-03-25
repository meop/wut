if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] &&type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt purge $PACK_DEL_NAMES
      fi
    else
      logOp apt purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        apt purge $PACK_DEL_NAMES
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
    read yn?'> del packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt-get purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get purge $PACK_DEL_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    logOp brew uninstall $PACK_DEL_NAMES
    if [[ -z "${NOOP}" ]]; then
      brew uninstall $PACK_DEL_NAMES
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo dnf remove $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo dnf remove $PACK_DEL_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    logOp yay --remove --recursive --nosave $PACK_DEL_NAMES
    if [[ -z "${NOOP}" ]]; then
      yay --remove --recursive --nosave $PACK_DEL_NAMES
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
    else
      logOp pacman --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
    fi
  fi
fi
