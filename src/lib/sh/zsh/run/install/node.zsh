function () {
  local yn

  if [[ "${sys_os_plat}" == 'linux' ]]; then
    if [[ "${sys_os_dist}" == 'debian' ]]; then
      local node_version=23

      function install_nodesource_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*nodesource.*com.*$' > /dev/null; then
          local url="https://deb.nodesource.com/setup_${node_version}.x"
          runOp sudo -E bash -c '"$(' curl --location --silent --url "${url}" ')"'
        fi
      }

      read yn?'? install node js (system) [y/N] '
      if [[ "${yn}" == 'y' ]]; then
        install_nodesource_repo
        runOp sudo apt update
        runOp sudo apt install nodejs
      fi

      read yn?'? install npm (system) [y/N] '
      if [[ "${yn}" == 'y' ]]; then
        install_nodesource_repo
        runOp sudo apt update
        runOp sudo apt install npm
      fi
    fi
  fi
}
