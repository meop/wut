function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with apt (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt update
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp sudo apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp sudo apt list --upgradable
        fi
      else
        runOp apt update
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp apt list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp apt list --upgradable
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
      read yn?'? out packages with apt-get (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt-get update
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp sudo apt-get list --upgradable
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with brew (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp brew update
      if [[ "${PACK_OUT_NAMES}" ]]; then
        runOp brew outdated | grep --ignore-case $PACK_OUT_NAMES
      else
        runOp brew outdated
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with dnf (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo dnf check-update
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp sudo dnf list --upgrades
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with yay (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp yay --sync --refresh
      if [[ "${PACK_OUT_NAMES}" ]]; then
        runOp yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      else
        runOp yay --query --upgrades
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with pacman (system) [[y]/n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo pacman --sync --refresh
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp sudo pacman --query --upgrades
        fi
      else
        runOp pacman --sync --refresh
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOp pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOp pacman --query --upgrades
        fi
      fi
    fi
  fi
}
