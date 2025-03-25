if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> find packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      logOp sudo apt search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo apt search $PACK_FIND_NAMES
      fi
    else
      logOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      logOp apt search $PACK_FIND_NAMES
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
      logOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      logOp sudo apt-cache search $PACK_FIND_NAMES
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
    logOp brew search $PACK_FIND_NAMES
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
      logOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      logOp sudo dnf search $PACK_FIND_NAMES
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
    logOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    logOp yay --sync --search $PACK_FIND_NAMES
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
      logOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      logOp sudo pacman --sync --search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --search $PACK_FIND_NAMES
      fi
    else
      logOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      logOp pacman --sync --search $PACK_FIND_NAMES
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --search $PACK_FIND_NAMES
      fi
    fi
  fi
fi
