function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with apt (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt purge $PACK_DEL_NAMES
      else
        opPrintRunCmd apt purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with apt-get (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo apt-get purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with brew (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      opPrintRunCmd brew uninstall $PACK_DEL_NAMES
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with dnf (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo dnf remove $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with yay (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      opPrintRunCmd yay --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? rem packages with pacman (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      if type sudo > /dev/null; then
        opPrintRunCmd sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      else
        opPrintRunCmd pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          opPrintRunCmd "${presetSplit[@]}"
        done
      fi
    fi
  fi
}
