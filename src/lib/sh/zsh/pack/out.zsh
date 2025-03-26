if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> out packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp sudo apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp sudo apt list --upgradable
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --upgradable
        fi
      fi
    else
      printOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          apt list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp apt list --upgradable
        if [[ -z "${NOOP}" ]]; then
          apt list --upgradable
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
    read yn?'> out packages with apt-get [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp sudo apt-get list --upgradable
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --upgradable
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> out packages with brew [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp brew update
    if [[ -z "${NOOP}" ]]; then
      brew update
    fi
    if [[ "${PACK_OUT_NAMES}" ]]; then
      printOp brew outdated | grep --ignore-case $PACK_OUT_NAMES
      if [[ -z "${NOOP}" ]]; then
        brew outdated | grep --ignore-case $PACK_OUT_NAMES
      fi
    else
      printOp brew outdated
      if [[ -z "${NOOP}" ]]; then
        brew outdated
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> out packages with dnf [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp sudo dnf list --upgrades
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --upgrades
        fi
      fi
    fi
  fi
fi

if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> out packages with yay [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    printOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${PACK_OUT_NAMES}" ]]; then
      printOp yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      if [[ -z "${NOOP}" ]]; then
        yay --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
      fi
    else
      printOp yay --query --upgrades
      if [[ -z "${NOOP}" ]]; then
        yay --query --upgrades
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
    read yn?'> out packages with pacman [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      printOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp sudo pacman --query --upgrades
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query --upgrades
        fi
      fi
    else
      printOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        printOp pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          pacman --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        printOp pacman --query --upgrades
        if [[ -z "${NOOP}" ]]; then
          pacman --query --upgrades
        fi
      fi
    fi
  fi
fi
