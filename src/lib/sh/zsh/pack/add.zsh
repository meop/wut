function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt update '>' /dev/null '2>&1'
        opPrintRunCmd sudo apt install $PACK_ADD_NAMES
      else
        opPrintRunCmd apt update '>' /dev/null '2>&1'
        opPrintRunCmd apt install $PACK_ADD_NAMES
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt-get update '>' /dev/null '2>&1'
        opPrintRunCmd sudo apt-get install $PACK_ADD_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      opPrintRunCmd brew update '>' /dev/null '2>&1'
      opPrintRunCmd brew install $PACK_ADD_NAMES
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      if type sudo > /dev/null; then
        opPrintRunCmd sudo dnf check-update '>' /dev/null '2>&1'
        opPrintRunCmd sudo dnf install $PACK_ADD_NAMES
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      opPrintRunCmd yay --sync --refresh '>' /dev/null '2>&1'
      opPrintRunCmd yay --sync --needed $PACK_ADD_NAMES
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? add packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if [[ $PACK_ADD_GROUPS ]]; then
        for preset in "${PACK_ADD_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
      if type sudo > /dev/null; then
        opPrintRunCmd sudo pacman --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd sudo pacman --sync --needed $PACK_ADD_NAMES
      else
        opPrintRunCmd pacman --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd pacman --sync --needed $PACK_ADD_NAMES
      fi
    fi
  fi
}
