if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> list packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      if [[ "${PACK_LIST_NAMES}" ]]; then
        logOp sudo apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp sudo apt list --installed
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --installed
        fi
      fi
    else
      if [[ "${PACK_LIST_NAMES}" ]]; then
        logOp apt list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          apt list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp apt list --installed
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
        logOp sudo apt-get list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp sudo apt-get list --installed
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
      logOp brew list '|' grep --ignore-case $PACK_LIST_NAMES
      if [[ -z "${NOOP}" ]]; then
        brew list | grep --ignore-case $PACK_LIST_NAMES
      fi
    else
      logOp brew list
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
        logOp sudo dnf list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --installed | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp sudo dnf list --installed
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
      logOp yay --query '|' grep --ignore-case $PACK_LIST_NAMES
      if [[ -z "${NOOP}" ]]; then
        yay --query | grep --ignore-case $PACK_LIST_NAMES
      fi
    else
      logOp yay --query
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
        logOp sudo pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp sudo pacman --query
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query
        fi
      fi
    else
      if [[ "${PACK_LIST_NAMES}" ]]; then
        logOp pacman --query '|' grep --ignore-case $PACK_LIST_NAMES
        if [[ -z "${NOOP}" ]]; then
          pacman --query | grep --ignore-case $PACK_LIST_NAMES
        fi
      else
        logOp pacman --query
        if [[ -z "${NOOP}" ]]; then
          pacman --query
        fi
      fi
    fi
  fi
fi
