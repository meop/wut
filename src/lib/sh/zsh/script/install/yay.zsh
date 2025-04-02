function () {
  local yn

  if type pacman > /dev/null; then
    read yn?'? install yay (user) [n/[y]] '
    if [[ "${yn}" == 'y' ]]; then
      local output="${HOME}/.yay-bin"

      if [[ -d "${output}" ]]; then
        dynOp git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://aur.archlinux.org/yay-bin.git'
        dynOp git clone --depth 1 --quiet "${url}" "${output}"
      fi

      (
        dynOp pushd "${output}"
        dynOp makepkg --install --syncdeps
        dynOp popd
      )
    fi
  fi
}
