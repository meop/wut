function () {
  local yn=''

  if type pacman > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? install yay (user) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      local output="${HOME}/.yay-bin"

      if [[ -d "${output}" ]]; then
        opPrintRunCmd git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://aur.archlinux.org/yay-bin.git'
        opPrintRunCmd git clone --depth 1 --quiet "${url}" "${output}"
      fi

      (
        opPrintRunCmd pushd "${output}" '>' /dev/null '2>&1'
        opPrintRunCmd makepkg --install --syncdeps
        opPrintRunCmd popd '>' /dev/null '2>&1'
      )
    fi
  fi
}
