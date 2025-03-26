if type pacman > /dev/null; then
  read yn?'? install yay [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    output="${HOME}/.yay-bin"
    if [[ -d "${output}" ]]; then
      printOp git -C "${output}" pull --prune '>' /dev/null '2>&1'
      if [[ -z "${NOOP}" ]]; then
        git -C "${output}" pull --prune > /dev/null 2>&1
      fi
    else
      url='https://aur.archlinux.org/yay-bin.git'
      printOp git clone -q --depth 1 "${url}" "${output}"
      if [[ -z "${NOOP}" ]]; then
        git clone -q --depth 1 "${url}" "${output}"
      fi
    fi

    (
      printOp pushd "${output}"
      if [[ -z "${NOOP}" ]]; then
        pushd "${output}"
      fi
      printOp makepkg --install --syncdeps
      if [[ -z "${NOOP}" ]]; then
        makepkg --install --syncdeps
      fi
      printOp popd
      if [[ -z "${NOOP}" ]]; then
        popd
      fi
    )
  fi
fi
