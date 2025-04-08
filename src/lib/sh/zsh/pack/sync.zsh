function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond sudo apt install $PACK_UP_NAMES
        else
          runOpCond sudo apt full-upgrade
        fi
      else
        runOpCond apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond apt install $PACK_UP_NAMES
        else
          runOpCond apt full-upgrade
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
      read yn?'? sync packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo apt-get update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond sudo apt-get install $PACK_UP_NAMES
        else
          runOpCond sudo apt-get dist-upgrade
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      runOpCond brew update '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOpCond brew upgrade --greedy $PACK_UP_NAMES
      else
        runOpCond brew upgrade --greedy
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo dnf check-update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond sudo dnf upgrade $PACK_UP_NAMES
        else
          runOpCond sudo dnf distro-sync
        fi
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      runOpCond yay --sync --refresh '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        runOpCond yay --sync --needed $PACK_UP_NAMES
      else
        runOpCond yay --sync --sysupgrade
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        runOpCond sudo pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond sudo pacman --sync --needed $PACK_UP_NAMES
        else
          runOpCond sudo pacman --sync --sysupgrade
        fi
      else
        runOpCond pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          runOpCond pacman --sync --needed $PACK_UP_NAMES
        else
          runOpCond pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
}
