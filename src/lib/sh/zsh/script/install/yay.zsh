function () {
  local yn

  if type pacman > /dev/null; then
    read yn?'? install yay (user) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local output="${HOME}/.yay-bin"

      if [[ -d "${output}" ]]; then
        runOpCond git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://aur.archlinux.org/yay-bin.git'
        runOpCond git clone --depth 1 --quiet "${url}" "${output}"
      fi

      (
        runOpCond pushd "${output}" '>' /dev/null '2>&1'
        runOpCond makepkg --install --syncdeps
        runOpCond popd '>' /dev/null '2>&1'
      )
    fi
  fi
}
