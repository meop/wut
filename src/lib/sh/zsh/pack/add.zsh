if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> add packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    if type sudo > /dev/null; then
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      printOp sudo apt install $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt install $PACK_ADD_NAMES
      fi
    else
      printOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      printOp apt install $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        apt install $PACK_ADD_NAMES
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
    read yn?'> add packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    if type sudo > /dev/null; then
      printOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      printOp sudo apt-get install $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get install $PACK_ADD_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> add packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    printOp brew update
    if [[ -z "${NOOP}" ]]; then
      brew update
    fi
    printOp brew install $PACK_ADD_NAMES
    if [[ -z "${NOOP}" ]]; then
      brew install $PACK_ADD_NAMES
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> add packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    if type sudo > /dev/null; then
      printOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      printOp sudo dnf install $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo dnf install $PACK_ADD_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] &&type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> add packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    printOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    printOp yay --sync --needed $PACK_ADD_NAMES
    if [[ -z "${NOOP}" ]]; then
      yay --sync --needed $PACK_ADD_NAMES
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> add packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ $PACK_ADD_PRESET ]]; then
      printOp eval $PACK_ADD_PRESET
      if [[ -z "${NOOP}" ]]; then
        eval $PACK_ADD_PRESET
      fi
    fi
    if type sudo > /dev/null; then
      printOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      printOp sudo pacman --sync --needed $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --needed $PACK_ADD_NAMES
      fi
    else
      printOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      printOp pacman --sync --needed $PACK_ADD_NAMES
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --needed $PACK_ADD_NAMES
      fi
    fi
  fi
fi
