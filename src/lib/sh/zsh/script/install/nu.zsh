function () {
  local yn=''

  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'debian' ]]; then
      # https://www.nushell.sh/book/installation.html#pre-built-binaries

      function install_nu_repo {
        local output="/etc/apt/sources.list.d/fury-nushell.list"
        if [[ ! -f "${output}" ]]; then
          local url="https://apt.fury.io/nushell"
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'curl --fail-with-body --location --no-progress-meter --url "${url}/gpg.key" '|' gpg --dearmor -o /etc/apt/trusted.gpg.d/fury-nushell.gpg'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'deb "${url}/" /''\' '>' "${output}"'"'
        fi
      }

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install nu (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        install_nu_repo
        opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
        opPrintMaybeRunCmd sudo apt install nushell
      fi
    else
      echo 'script is for debian'
    fi
  else
    echo 'script is for linux'
  fi
}
