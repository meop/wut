if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      printOp sudo apt search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt search $PACK_FIND_NAMES
      fi
    else
      printOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      printOp apt search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        apt search $PACK_FIND_NAMES
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
    read yn?'> find packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      printOp sudo apt-cache search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt-cache search $PACK_FIND_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp brew search $PACK_FIND_NAMES
    if [[ -z "${NOOP}" ]]; then
      brew search $PACK_FIND_NAMES
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      printOp sudo dnf search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo dnf search $PACK_FIND_NAMES
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    printOp yay --sync --search $PACK_FIND_NAMES
    if [[ -z "${NOOP}" ]]; then
      yay --sync --search $PACK_FIND_NAMES
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      printOp sudo pacman --sync --search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --search $PACK_FIND_NAMES
      fi
    else
      printOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      printOp pacman --sync --search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --search $PACK_FIND_NAMES
      fi
    fi
  fi
fi
