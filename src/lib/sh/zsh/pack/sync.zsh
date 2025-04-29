function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond sudo apt install $PACK_UP_NAMES
        else
          shRunOpCond sudo apt full-upgrade
        fi
      else
        shRunOpCond apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond apt install $PACK_UP_NAMES
        else
          shRunOpCond apt full-upgrade
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
      read 'yn?? sync packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo apt-get update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond sudo apt-get install $PACK_UP_NAMES
        else
          shRunOpCond sudo apt-get dist-upgrade
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      shRunOpCond brew update '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        shRunOpCond brew upgrade --greedy $PACK_UP_NAMES
      else
        shRunOpCond brew upgrade --greedy
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo dnf check-update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond sudo dnf upgrade $PACK_UP_NAMES
        else
          shRunOpCond sudo dnf distro-sync
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      shRunOpCond yay --sync --refresh '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        shRunOpCond yay --sync --needed $PACK_UP_NAMES
      else
        shRunOpCond yay --sync --sysupgrade
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        shRunOpCond sudo pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond sudo pacman --sync --needed $PACK_UP_NAMES
        else
          shRunOpCond sudo pacman --sync --sysupgrade
        fi
      else
        shRunOpCond pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          shRunOpCond pacman --sync --needed $PACK_UP_NAMES
        else
          shRunOpCond pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
}
