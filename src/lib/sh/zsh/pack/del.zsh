if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] &&type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> del packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt purge $PACK_DEL_NAMES
      fi
    else
      printOp apt purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        apt purge $PACK_DEL_NAMES
      fi
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
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
      printOp sudo apt-get purge $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get purge $PACK_DEL_NAMES
      fi
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
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
    printOp brew uninstall $PACK_DEL_NAMES
    if [[ -z "${NOOP}" ]]; then
      brew uninstall $PACK_DEL_NAMES
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
      fi
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
      printOp sudo dnf remove $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo dnf remove $PACK_DEL_NAMES
      fi
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
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
    printOp yay --remove --recursive --nosave $PACK_DEL_NAMES
    if [[ -z "${NOOP}" ]]; then
      yay --remove --recursive --nosave $PACK_DEL_NAMES
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
      fi
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
      printOp sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
    else
      printOp pacman --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ -z "${NOOP}" ]]; then
        pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
    fi
    if [[ $PACK_DEL_PRESET ]]; then
      printOp eval $PACK_DEL_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_DEL_PRESET
      fi
    fi
  fi
fi
