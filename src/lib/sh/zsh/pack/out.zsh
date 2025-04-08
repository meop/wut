function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo apt update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond sudo apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond sudo apt list --upgradable '2>' /dev/null
        fi
      else
        runOpCond apt update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond apt list --upgradable '2>' /dev/null
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
      read yn?'? out packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo apt-get update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond sudo apt-get list --upgradable
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      runOpCond brew update '>' /dev/null '2>&1'
      if [[ "${PACK_OUT_NAMES}" ]]; then
        runOpCond brew outdated | grep --ignore-case $PACK_OUT_NAMES
      else
        runOpCond brew outdated
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo dnf check-update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond sudo dnf list --upgrades
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      runOpCond yay --sync --refresh '>' /dev/null '2>&1'
      if [[ "${PACK_OUT_NAMES}" ]]; then
        runOpCond yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      else
        runOpCond yay --query --upgrades
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? out packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond sudo pacman --query --upgrades
        fi
      else
        runOpCond pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          runOpCond pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          runOpCond pacman --query --upgrades
        fi
      fi
    fi
  fi
}
