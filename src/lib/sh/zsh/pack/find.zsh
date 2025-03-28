function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with apt [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt update
        runOp sudo apt search $PACK_FIND_NAMES
      else
        runOp apt update
        runOp apt search $PACK_FIND_NAMES
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with apt-get [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt-get update
        runOp sudo apt-cache search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with brew [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp brew search $PACK_FIND_NAMES
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with dnf [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo dnf check-update
        runOp sudo dnf search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with yay [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp yay --sync --refresh
      runOp yay --sync --search $PACK_FIND_NAMES
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with pacman [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo pacman --sync --refresh
        runOp sudo pacman --sync --search $PACK_FIND_NAMES
      else
        runOp pacman --sync --refresh
        runOp pacman --sync --search $PACK_FIND_NAMES
      fi
    fi
  fi
}
