function () {
  local yn=''

  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'debian' ]]; then
      local node_version=23

      function install_nodesource_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*deb.*nodesource.*com.*$' > /dev/null; then
          local url="https://deb.nodesource.com/setup_${node_version}.x"
          opPrintMaybeRunCmd sudo --preserve-env bash -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
        fi
      }

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install node js (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        install_nodesource_repo
        opPrintMaybeRunCmd sudo apt update '> /dev/null 2>&1'
        opPrintMaybeRunCmd sudo apt install nodejs
      fi

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install npm (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        install_nodesource_repo
        opPrintMaybeRunCmd sudo apt update '> /dev/null 2>&1'
        opPrintMaybeRunCmd sudo apt install npm
      fi
    fi
  fi
}
