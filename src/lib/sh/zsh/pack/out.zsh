if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'> out packages with apt [system]? (y/N) '
  fi
  if [[ "${yn}" == 'y' ]]; then
    if type sudo > /dev/null; then
      logOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp sudo apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp sudo apt list --upgradable
        if [[ -z "${NOOP}" ]]; then
          sudo apt list --upgradable
        fi
      fi
    else
      logOp apt update
      if [[ -z "${NOOP}" ]]; then
        apt update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          apt list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp apt list --upgradable
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
      logOp sudo apt-get update
      if [[ -z "${NOOP}" ]]; then
        sudo apt-get update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo apt-get list --upgradable | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp sudo apt-get list --upgradable
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
    logOp brew update
    if [[ -z "${NOOP}" ]]; then
      brew update
    fi
    if [[ "${PACK_OUT_NAMES}" ]]; then
      logOp brew outdated | grep --ignore-case $PACK_OUT_NAMES
      if [[ -z "${NOOP}" ]]; then
        brew outdated | grep --ignore-case $PACK_OUT_NAMES
      fi
    else
      logOp brew outdated
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
      logOp sudo dnf check-update
      if [[ -z "${NOOP}" ]]; then
        sudo dnf check-update
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo dnf list --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp sudo dnf list --upgrades
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
    logOp yay --sync --refresh
    if [[ -z "${NOOP}" ]]; then
      yay --sync --refresh
    fi
    if [[ "${PACK_OUT_NAMES}" ]]; then
      logOp yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      if [[ -z "${NOOP}" ]]; then
        yay --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
      fi
    else
      logOp yay --query --upgrades
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
      logOp sudo pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        sudo pacman --sync --refresh
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp sudo pacman --query --upgrades
        if [[ -z "${NOOP}" ]]; then
          sudo pacman --query --upgrades
        fi
      fi
    else
      logOp pacman --sync --refresh
      if [[ -z "${NOOP}" ]]; then
        pacman --sync --refresh
      fi
      if [[ "${PACK_OUT_NAMES}" ]]; then
        logOp pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        if [[ -z "${NOOP}" ]]; then
          pacman --query --upgrades | grep --ignore-case $PACK_OUT_NAMES
        fi
      else
        logOp pacman --query --upgrades
        if [[ -z "${NOOP}" ]]; then
          pacman --query --upgrades
        fi
      fi
    fi
  fi
fi
