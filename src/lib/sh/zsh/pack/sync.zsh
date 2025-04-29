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
        opPrintRunCmd sudo apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd sudo apt install $PACK_UP_NAMES
        else
          opPrintRunCmd sudo apt full-upgrade
        fi
      else
        opPrintRunCmd apt update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd apt install $PACK_UP_NAMES
        else
          opPrintRunCmd apt full-upgrade
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
        opPrintRunCmd sudo apt-get update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd sudo apt-get install $PACK_UP_NAMES
        else
          opPrintRunCmd sudo apt-get dist-upgrade
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
      opPrintRunCmd brew update '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        opPrintRunCmd brew upgrade --greedy $PACK_UP_NAMES
      else
        opPrintRunCmd brew upgrade --greedy
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
        opPrintRunCmd sudo dnf check-update '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd sudo dnf upgrade $PACK_UP_NAMES
        else
          opPrintRunCmd sudo dnf distro-sync
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
      opPrintRunCmd yay --sync --refresh '>' /dev/null '2>&1'
      if [[ "${PACK_UP_NAMES}" ]]; then
        opPrintRunCmd yay --sync --needed $PACK_UP_NAMES
      else
        opPrintRunCmd yay --sync --sysupgrade
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
        opPrintRunCmd sudo pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd sudo pacman --sync --needed $PACK_UP_NAMES
        else
          opPrintRunCmd sudo pacman --sync --sysupgrade
        fi
      else
        opPrintRunCmd pacman --sync --refresh '>' /dev/null '2>&1'
        if [[ "${PACK_UP_NAMES}" ]]; then
          opPrintRunCmd pacman --sync --needed $PACK_UP_NAMES
        else
          opPrintRunCmd pacman --sync --sysupgrade
        fi
      fi
    fi
  fi
}
