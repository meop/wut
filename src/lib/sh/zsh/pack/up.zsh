if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? up packages with apt [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      runOp sudo apt update
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp sudo apt install $PACK_UP_NAMES
      else
        runOp sudo apt full-upgrade
      fi
    else
      runOp apt update
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp apt install $PACK_UP_NAMES
      else
        runOp apt full-upgrade
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
    read yn?'? up packages with apt-get [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      runOp sudo apt-get update
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp sudo apt-get install $PACK_UP_NAMES
      else
        runOp sudo apt-get dist-upgrade
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? up packages with brew [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    runOp brew update
    if [[ "${PACK_UP_NAMES}" ]]; then
      runOp brew upgrade --greedy $PACK_UP_NAMES
    else
      runOp brew upgrade --greedy
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? up packages with dnf [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      runOp sudo dnf check-update
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp sudo dnf upgrade $PACK_UP_NAMES
      else
        runOp sudo dnf distro-sync
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? up packages with yay [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    runOp yay --sync --refresh
    if [[ "${PACK_UP_NAMES}" ]]; then
      runOp yay --sync --needed $PACK_UP_NAMES
    else
      runOp yay --sync --sysupgrade
    fi
  fi
fi
if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
  if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
    yn='n'
  elif [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? up packages with pacman [system] (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      runOp sudo pacman --sync --refresh
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp sudo pacman --sync --needed $PACK_UP_NAMES
      else
        runOp sudo pacman --sync --sysupgrade
      fi
    else
      runOp pacman --sync --refresh
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOp pacman --sync --needed $PACK_UP_NAMES
      else
        runOp pacman --sync --sysupgrade
      fi
    fi
  fi
fi
