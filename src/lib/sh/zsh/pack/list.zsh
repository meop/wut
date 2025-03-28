function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with apt [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp sudo apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp sudo apt list --installed
        fi
      else
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp apt list --installed
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
      read yn?'? list packages with apt-get [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp sudo apt-get list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp sudo apt-get list --installed
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with brew [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        runOp brew list '|' grep --ignore-case $PACK_LIST_NAMES
      else
        runOp brew list
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with dnf [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp sudo dnf list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp sudo dnf list --installed
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with yay [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        runOp yay --query '|' grep --ignore-case $PACK_LIST_NAMES
      else
        runOp yay --query
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with pacman [system] (y/N) '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp sudo pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp sudo pacman --query
        fi
      else
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOp pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOp pacman --query
        fi
      fi
    fi
  fi
}
