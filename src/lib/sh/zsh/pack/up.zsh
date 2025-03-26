if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> up packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp sudo apt install $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt install $PACK_UP_NAMES
        fi
      else
        printOp sudo apt full-upgrade
        if [[ -z "${NOOP}" ]]; then
          sudo apt full-upgrade
        fi
      fi
    else
      printOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp apt install $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          apt install $PACK_UP_NAMES
        fi
      else
        printOp apt full-upgrade
        if [[ -z "${NOOP}" ]]; then
          apt full-upgrade
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
    read yn?'> up packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp sudo apt-get install $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get install $PACK_UP_NAMES
        fi
      else
        printOp sudo apt-get dist-upgrade
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get dist-upgrade
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> up packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp brew update
    if [[ -z "${NOOP}" ]]; then
      brew update
    fi
    if [[ "${PACK_UP_NAMES}" ]]; then
      printOp brew upgrade --greedy $PACK_UP_NAMES
      if [[ -z "${NOOP}" ]]; then
        brew upgrade --greedy $PACK_UP_NAMES
      fi
    else
      printOp brew upgrade --greedy
      if [[ -z "${NOOP}" ]]; then
        brew upgrade --greedy
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> up packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp sudo dnf upgrade $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo dnf upgrade $PACK_UP_NAMES
        fi
      else
        printOp sudo dnf distro-sync
        if [[ -z "${NOOP}" ]]; then
          sudo dnf distro-sync
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> up packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${PACK_UP_NAMES}" ]]; then
      printOp yay --sync --needed $PACK_UP_NAMES
      if [[ -z "${NOOP}" ]]; then
        yay --sync --needed $PACK_UP_NAMES
      fi
    else
      printOp yay --sync --sysupgrade
      if [[ -z "${NOOP}" ]]; then
        yay --sync --sysupgrade
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
    read yn?'> up packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp sudo pacman --sync --needed $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --sync --needed $PACK_UP_NAMES
        fi
      else
        printOp sudo pacman --sync --sysupgrade
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --sync --sysupgrade
        fi
      fi
    else
      printOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${PACK_UP_NAMES}" ]]; then
        printOp pacman --sync --needed $PACK_UP_NAMES
        if [[ -z "${NOOP}" ]]; then
          pacman --sync --needed $PACK_UP_NAMES
        fi
      else
        printOp pacman --sync --sysupgrade
        if [[ -z "${NOOP}" ]]; then
          pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
fi
