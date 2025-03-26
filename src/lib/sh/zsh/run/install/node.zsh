if [[ "${sys_os_plat}" == 'Linux' ]]; then
  if [[ "${sys_os_dist}" == 'debian' ]]; then
    NODE_VERSION=23

    function install_nodesource_repo {
      if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*nodesource.*com.*$' > /dev/null; then
        _url="https://deb.nodesource.com/setup_${NODE_VERSION}.x"
        runOp curl --fail --location --show-error --silent --url "${_url}" '|' sudo -E bash
      fi
    }

    read yn?'? install node js [system] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      runOp sudo apt update
      runOp sudo apt install nodejs
    fi

    read yn?'? install npm [system] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      runOp sudo apt update
      runOp sudo apt install npm
    fi
  fi
fi
