function () {
  local yn=''
  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'debian' || $SYS_OS_ID == 'ubuntu' ]]; then
      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install node (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        function install_nodesource_repo {
          local node_ver='24'
          local url="https://deb.nodesource.com/setup_${node_ver}.x"
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
        }
        install_nodesource_repo
        opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
        opPrintMaybeRunCmd sudo apt install nodejs
      fi
    else
      echo 'script is for debian/ubuntu'
    fi
  else
    echo 'script is for linux'
  fi
}
