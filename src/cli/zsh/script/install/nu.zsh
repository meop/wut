# https://www.nushell.sh/book/installation.html#pre-built-binaries
function () {
  local yn=''
  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'debian' || $SYS_OS_ID == 'ubuntu' ]]; then
      function install_nu_repo {
        local output="/etc/apt/sources.list.d/fury-nushell.list"
        if [[ ! -f "${output}" ]]; then
          local url='https://apt.fury.io/nushell'
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
    elif [[ $SYS_OS_ID == 'rocky' || $SYS_OS_ID == 'fedora' ]]; then
      function install_nu_repo {
        local output='/etc/yum.repos.d/fury-nushell.repo'
        if [[ ! -f "${output}" ]]; then
          local url='https://yum.fury.io/nushell'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\''[gemfury-nushell]'''\' '>' "${output}"'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'name=Gemfury Nushell Repo''\' '>>' "${output}"'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'baseurl=${url}/''\' '>>' "${output}"'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'enabled=1''\' '>>' "${output}"'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'gpgcheck=0''\' '>>' "${output}"'"'
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'gpgkey=${url}/gpg.key''\' '>>' "${output}"'"'
        fi
      }
      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install nu (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        install_nu_repo
        opPrintMaybeRunCmd sudo dnf check-update '>' /dev/null '2>&1'
        opPrintMaybeRunCmd sudo dnf install nushell
      fi
    else
      echo 'script is for debian/ubuntu or rocky/fedora'
    fi
  else
    echo 'script is for linux'
  fi
}
