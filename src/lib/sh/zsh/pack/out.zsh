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
        dynOp sudo apt update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp sudo apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp sudo apt list --upgradable '2>' /dev/null
        fi
      else
        dynOp apt update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp apt list --upgradable '2>' /dev/null
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
        dynOp sudo apt-get update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp sudo apt-get list --upgradable
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
      dynOp brew update '2>&1' '|' '>' /dev/null
      if [[ "${PACK_OUT_NAMES}" ]]; then
        dynOp brew outdated | grep --ignore-case $PACK_OUT_NAMES
      else
        dynOp brew outdated
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
        dynOp sudo dnf check-update '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp sudo dnf list --upgrades
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
      dynOp yay --sync --refresh '2>&1' '|' '>' /dev/null
      if [[ "${PACK_OUT_NAMES}" ]]; then
        dynOp yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      else
        dynOp yay --query --upgrades
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
        dynOp sudo pacman --sync --refresh '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp sudo pacman --query --upgrades
        fi
      else
        dynOp pacman --sync --refresh '2>&1' '|' '>' /dev/null
        if [[ "${PACK_OUT_NAMES}" ]]; then
          dynOp pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          dynOp pacman --query --upgrades
        fi
      fi
    fi
  fi
}
