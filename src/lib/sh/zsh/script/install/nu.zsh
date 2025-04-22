function () {
  local yn

  if [[ "${SYS_OS_PLAT}" == 'linux' ]]; then
    if [[ "${sys_os}" == 'debian' ]]; then
      # https://www.nushell.sh/book/installation.html#pre-built-binaries

      function install_nu_repo {
        local output="/etc/apt/sources.list.d/fury-nushell.list"
        if [[ ! -f "${output}" ]]; then
          local url="https://apt.fury.io/nushell"
          shRunOpCond sudo -E bash -c '"'curl --fail-with-body --location --silent --url "${url}/gpg.key" '|' gpg --dearmor -o /etc/apt/trusted.gpg.d/fury-nushell.gpg'"'
          shRunOpCond sudo -E bash -c '"'echo ''\'deb "${url}/" /''\' '>' "${output}"'"'
        fi
      }

      if [[ "${YES}" ]]; then
        yn='y'
      else
        read yn?'? install nu (system) [y, [n]] '
      fi
      if [[ "${yn}" != 'n' ]]; then
        install_nu_repo
        shRunOpCond sudo apt update
        shRunOpCond sudo apt install nushell
      fi
    fi
  fi
}
