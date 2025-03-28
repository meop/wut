function () {
  local yn

  if type pacman > /dev/null; then
    read yn?'? install yay [user] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      local output="${HOME}/.yay-bin"

      if [[ -d "${output}" ]]; then
        runOp git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://aur.archlinux.org/yay-bin.git'
        runOp git clone --depth 1 --quiet "${url}" "${output}"
      fi

      (
        runOp pushd "${output}"
        runOp makepkg --install --syncdeps
        runOp popd
      )
    fi
  fi
}
