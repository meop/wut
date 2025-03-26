if type pacman > /dev/null; then
  read yn?'? install yay [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _output="${HOME}/.yay-bin"
    if [[ -d "${_output}" ]]; then
      runOp git -C "${_output}" pull --prune '>' /dev/null '2>&1'
    else
      _url='https://aur.archlinux.org/yay-bin.git'
      runOp git clone -q --depth 1 "${_url}" "${_output}"
    fi

    (
      runOp pushd "${_output}"
      runOp makepkg --install --syncdeps
      runOp popd
    )
  fi
fi
