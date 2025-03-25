if type pacman > /dev/null; then
  read yn?'> install yay [user]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    output="${HOME}/.yay-bin"
    if [[ -d "${output}" ]]; then
      logOp git -C "${output}" pull --prune '>' /dev/null '2>&1'
      if [[ -z "${NOOP}" ]]; then
        git -C "${output}" pull --prune > /dev/null 2>&1
      fi
    else
      uri='https://aur.archlinux.org/yay-bin.git'
      logOp git clone -q --depth 1 "${uri}" "${output}"
      if [[ -z "${NOOP}" ]]; then
        git clone -q --depth 1 "${uri}" "${output}"
      fi
    fi

    (
      logOp pushd "${output}"
      if [[ -z "${NOOP}" ]]; then
        pushd "${output}"
      fi
      logOp makepkg --install --syncdeps
      if [[ -z "${NOOP}" ]]; then
        makepkg --install --syncdeps
      fi
      logOp popd
      if [[ -z "${NOOP}" ]]; then
        popd
      fi
    )
  fi
fi
