if [[ "${SYS_OS_PLAT}" == 'Linux' ]]; then
  if [[ "${SYS_OS_DIST}" == 'debian' ]]; then
    NODE_VERSION=23

    function install_nodesource_repo {
      if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*nodesource.*com.*$' > /dev/null; then
        url="https://deb.nodesource.com/setup_${NODE_VERSION}.x"
        printOp curl --fail --location --show-error --silent --url "${url}" '|' sudo -E bash
        if [[ -z "${NOOP}" ]]; then
          curl --fail --location --show-error --silent --url "${url}" | sudo -E bash
        fi
      fi
    }

    read yn?'? install node js [system] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      printOp sudo apt install nodejs
      if [[ -z "${NOOP}" ]]; then
        sudo apt install nodejs
      fi
    fi

    read yn?'? install npm [system] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      printOp sudo apt update
      if [[ -z "${NOOP}" ]]; then
        sudo apt update
      fi
      printOp sudo apt install npm
      if [[ -z "${NOOP}" ]]; then
        sudo apt install npm
      fi
    fi
  fi
fi
