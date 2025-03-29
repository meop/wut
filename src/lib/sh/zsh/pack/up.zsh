function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? up packages with apt (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp sudo apt install $PACK_UP_NAMES
        else
          dynOp sudo apt full-upgrade
        fi
      else
        dynOp apt update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp apt install $PACK_UP_NAMES
        else
          dynOp apt full-upgrade
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
      read yn?'? up packages with apt-get (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt-get update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp sudo apt-get install $PACK_UP_NAMES
        else
          dynOp sudo apt-get dist-upgrade
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? up packages with brew (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp brew update '2>&1' '|' '>' /dev/null
      if [[ "${PACK_UP_NAMES}" ]]; then
        dynOp brew upgrade --greedy $PACK_UP_NAMES
      else
        dynOp brew upgrade --greedy
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? up packages with dnf (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo dnf check-update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp sudo dnf upgrade $PACK_UP_NAMES
        else
          dynOp sudo dnf distro-sync
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? up packages with yay (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp yay --sync --refresh '2>&1' '|' '>' /dev/null
      if [[ "${PACK_UP_NAMES}" ]]; then
        dynOp yay --sync --needed $PACK_UP_NAMES
      else
        dynOp yay --sync --sysupgrade
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? up packages with pacman (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo pacman --sync --refresh '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp sudo pacman --sync --needed $PACK_UP_NAMES
        else
          dynOp sudo pacman --sync --sysupgrade
        fi
      else
        dynOp pacman --sync --refresh '2>&1' '|' '>' /dev/null
        if [[ "${PACK_UP_NAMES}" ]]; then
          dynOp pacman --sync --needed $PACK_UP_NAMES
        else
          dynOp pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
}
