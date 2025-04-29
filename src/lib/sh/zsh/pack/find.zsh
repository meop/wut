function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt update '>' /dev/null '2>&1'
        opPrintRunCmd sudo apt search $PACK_FIND_NAMES
      else
        opPrintRunCmd apt update '>' /dev/null '2>&1'
        opPrintRunCmd apt search $PACK_FIND_NAMES
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt-get update '>' /dev/null '2>&1'
        opPrintRunCmd sudo apt-cache search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      opPrintRunCmd brew search $PACK_FIND_NAMES
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo dnf check-update '>' /dev/null '2>&1'
        opPrintRunCmd sudo dnf search $PACK_FIND_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      opPrintRunCmd yay --sync --refresh '>' /dev/null '2>&1'
      opPrintRunCmd yay --sync --search $PACK_FIND_NAMES
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? find packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo pacman --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd sudo pacman --sync --search $PACK_FIND_NAMES
      else
        opPrintRunCmd pacman --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd pacman --sync --search $PACK_FIND_NAMES
      fi
    fi
  fi
}
