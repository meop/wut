function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with apt (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt update '>' /dev/null '2>&1'
        dynOp sudo apt search $PACK_FIND_NAMES
      else
        dynOp apt update '>' /dev/null '2>&1'
        dynOp apt search $PACK_FIND_NAMES
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with apt-get (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt-get update '>' /dev/null '2>&1'
        dynOp sudo apt-cache search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with brew (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp brew search $PACK_FIND_NAMES
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with dnf (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo dnf check-update '>' /dev/null '2>&1'
        dynOp sudo dnf search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with yay (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp yay --sync --refresh '>' /dev/null '2>&1'
      dynOp yay --sync --search $PACK_FIND_NAMES
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? find packages with pacman (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo pacman --sync --refresh '>' /dev/null '2>&1'
        dynOp sudo pacman --sync --search $PACK_FIND_NAMES
      else
        dynOp pacman --sync --refresh '>' /dev/null '2>&1'
        dynOp pacman --sync --search $PACK_FIND_NAMES
      fi
    fi
  fi
}
