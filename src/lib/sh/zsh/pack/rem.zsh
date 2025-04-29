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
        shRunOpCond sudo apt purge $PACK_DEL_NAMES
      else
        shRunOpCond apt purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
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
        shRunOpCond sudo apt-get purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
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
      shRunOpCond brew uninstall $PACK_DEL_NAMES
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
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
        shRunOpCond sudo dnf remove $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
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
      shRunOpCond yay --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
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
        shRunOpCond sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      else
        shRunOpCond pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_GROUPS ]]; then
        for preset in "${PACK_DEL_GROUPS[@]}"; do
          presetSplit=( ${(s: :)preset} )
          shRunOpCond "${presetSplit[@]}"
        done
      fi
    fi
  fi
}
