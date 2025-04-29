function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? out packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo apt update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond sudo apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond sudo apt list --upgradable '2>' /dev/null
        fi
      else
        shRunOpCond apt update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond apt list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond apt list --upgradable '2>' /dev/null
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
      read 'yn?? out packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo apt-get update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond sudo apt-get list --upgradable '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond sudo apt-get list --upgradable
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? out packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      shRunOpCond brew update '>' /dev/null '2>&1'
      if [[ "${PACK_OUT_NAMES}" ]]; then
        shRunOpCond brew outdated | grep --ignore-case $PACK_OUT_NAMES
      else
        shRunOpCond brew outdated
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? out packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo dnf check-update '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond sudo dnf list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond sudo dnf list --upgrades
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? out packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      shRunOpCond yay --sync --refresh '>' /dev/null '2>&1'
      if [[ "${PACK_OUT_NAMES}" ]]; then
        shRunOpCond yay --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
      else
        shRunOpCond yay --query --upgrades
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? out packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond sudo pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond sudo pacman --query --upgrades
        fi
      else
        shRunOpCond pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_OUT_NAMES}" ]]; then
          shRunOpCond pacman --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          shRunOpCond pacman --query --upgrades
        fi
      fi
    fi
  fi
}
