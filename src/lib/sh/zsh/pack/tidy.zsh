function () {
  local yn

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt' ]] && type apt > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with apt (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt autoclean
        runOp sudo apt autoremove
      else
        runOp apt autoclean
        runOp apt autoremove
      fi
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'apt-get' ]] && type apt-get > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type apt > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with apt-get (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo apt-get autoclean
        runOp sudo apt-get autoremove
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'brew' ]] && type brew > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with brew (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp brew cleanup --prune=all
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'dnf' ]] && type dnf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with dnf (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo dnf clean dbcache
        runOp sudo dnf autoremove
      fi
    fi
  fi

  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'yay' ]] && type yay > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with yay (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      runOp yay --sync --clean
    fi
  fi
  if [[ -z "${PACK_MANAGER}" || "${PACK_MANAGER}" == 'pacman' ]] && type pacman > /dev/null; then
    if [[ -z "${PACK_MANAGER}" ]] && type yay > /dev/null; then
      yn='n'
    elif [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy packages with pacman (system) [y/N] '
    fi
    if [[ "${yn}" == 'y' ]]; then
      if type sudo > /dev/null; then
        runOp sudo pacman --sync --clean
      else
        runOp pacman --sync --clean
      fi
    fi
  fi
}
