function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond sudo apt list --installed '2>' /dev/null '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond sudo apt list --installed '2>' /dev/null
        fi
      else
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond apt list --installed '2>' /dev/null '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond apt list --installed '2>' /dev/null
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
      read yn?'? list packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond sudo apt-get list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond sudo apt-get list --installed
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        runOpCond brew list '|' grep --ignore-case $PACK_LIST_NAMES
      else
        runOpCond brew list
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond sudo dnf list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond sudo dnf list --installed
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        runOpCond yay --query '|' grep --ignore-case $PACK_LIST_NAMES
      else
        runOpCond yay --query
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? list packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond sudo pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond sudo pacman --query
        fi
      else
        if [[ "${PACK_LIST_NAMES}" ]]; then
          runOpCond pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          runOpCond pacman --query
        fi
      fi
    fi
  fi
}
