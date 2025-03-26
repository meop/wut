if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> list packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp sudo apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp sudo apt list --installed
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --installed
        fi
      fi
    else
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          apt list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp apt list --installed
        if [[ -z "${NOOP}" ]]; then
          apt list --installed
        fi
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
    read yn?'> list packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp sudo apt-get list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp sudo apt-get list --installed
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --installed
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> list packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${PACK_LIST_NAMES}" ]]; then
      printOp brew list '|' grep --ignore-case $PACK_LIST_NAMES
      if [[ -z "${NOOP}" ]]; then
        brew list | grep --ignore-case $PACK_LIST_NAMES
      fi
    else
      printOp brew list
      if [[ -z "${NOOP}" ]]; then
        brew list
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> list packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp sudo dnf list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp sudo dnf list --installed
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --installed
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> list packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if [[ "${PACK_LIST_NAMES}" ]]; then
      printOp yay --query '|' grep --ignore-case $PACK_LIST_NAMES
      if [[ -z "${NOOP}" ]]; then
        yay --query | grep --ignore-case $PACK_LIST_NAMES
      fi
    else
      printOp yay --query
      if [[ -z "${NOOP}" ]]; then
        yay --query
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
    read yn?'> list packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp sudo pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp sudo pacman --query
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query
        fi
      fi
    else
      if [[ "${PACK_LIST_NAMES}" ]]; then
        printOp pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          pacman --query | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        printOp pacman --query
        if [[ -z "${NOOP}" ]]; then
          pacman --query
        fi
      fi
    fi
  fi
fi
