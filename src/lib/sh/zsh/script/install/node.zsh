function () {
  local yn

  if [[ "${sys_os_plat}" == 'linux' ]]; then
    if [[ "${sys_os_dist}" == 'debian' ]]; then
      local node_version=23

      function install_nodesource_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*nodesource.*com.*$' > /dev/null; then
          local url="https://deb.nodesource.com/setup_${node_version}.x"
          dynOp sudo -E bash -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
        fi
      }

      read yn?'? install node js (system) [n/[y]] '
      if [[ "${yn}" == 'y' ]]; then
        install_nodesource_repo
        dynOp sudo apt update
        dynOp sudo apt install nodejs
      fi

      read yn?'? install npm (system) [n/[y]] '
      if [[ "${yn}" == 'y' ]]; then
        install_nodesource_repo
        dynOp sudo apt update
        dynOp sudo apt install npm
      fi
    fi
  fi
}
