function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with apt (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      if type sudo > /dev/null; then
        runOp sudo apt update
        runOp sudo apt install $PACK_ADD_NAMES
      else
        runOp apt update
        runOp apt install $PACK_ADD_NAMES
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with apt-get (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      if type sudo > /dev/null; then
        runOp sudo apt-get update
        runOp sudo apt-get install $PACK_ADD_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with brew (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      runOp brew update
      runOp brew install $PACK_ADD_NAMES
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with dnf (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      if type sudo > /dev/null; then
        runOp sudo dnf check-update
        runOp sudo dnf install $PACK_ADD_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] &&type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with yay (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      runOp yay --sync --refresh
      runOp yay --sync --needed $PACK_ADD_NAMES
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? add packages with pacman (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ $PACK_ADD_PRESET ]]; then
        runOp $PACK_ADD_PRESET
      fi
      if type sudo > /dev/null; then
        runOp sudo pacman --sync --refresh
        runOp sudo pacman --sync --needed $PACK_ADD_NAMES
      else
        runOp pacman --sync --refresh
        runOp pacman --sync --needed $PACK_ADD_NAMES
      fi
    fi
  fi
}
