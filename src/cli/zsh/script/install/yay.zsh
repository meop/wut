function () {
  local yn=''
  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'arch' ]]; then
      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install yay (user) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        local output="${HOME}/.yay-bin"
        if [[ -d "${output}" ]]; then
          opPrintMaybeRunCmd git -C "${output}" pull --prune '>' /dev/null '2>&1'
        else
          local url='https://aur.archlinux.org/yay-bin.git'
          opPrintMaybeRunCmd git clone --depth 1 --quiet "${url}" "${output}"
        fi
        (
          opPrintMaybeRunCmd pushd "${output}" '>' /dev/null '2>&1'
          opPrintMaybeRunCmd makepkg --install --syncdeps
          opPrintMaybeRunCmd popd '>' /dev/null '2>&1'
        )
      fi
    else
      echo 'script is for arch'
    fi
  else
    echo 'script is for linux'
  fi
}
