function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? del packages with apt (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt purge $PACK_DEL_NAMES
      else
        dynOp apt purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
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
      read yn?'? del packages with apt-get (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo apt-get purge $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? del packages with brew (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp brew uninstall $PACK_DEL_NAMES
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? del packages with dnf (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo dnf remove $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
        done
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? del packages with yay (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      dynOp yay --remove --recursive --nosave $PACK_DEL_NAMES
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
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
      read yn?'? del packages with pacman (system) [[y], n] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        dynOp sudo pacman --remove --recursive --nosave $PACK_DEL_NAMES
      else
        dynOp pacman --remove --recursive --nosave $PACK_DEL_NAMES
      fi
      if [[ $PACK_DEL_PRESETS ]]; then
        for preset in "${PACK_DEL_PRESETS[@]}"; do
          presetSplit=(${(s: :)preset})
          dynOp "${presetSplit[@]}"
        done
      fi
    fi
  fi
}
