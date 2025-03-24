if [[ "${WUT_OS_PLAT}" == 'Linux' ]]; then
  if [[ "${WUT_OS_DIST}" == 'debian' ]]; then
    NODE_VERSION=23

    function install_nodesource_repo {
      if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep -v '^#' | grep -v '^$' | grep '^.*nodesource.*com.*$' > /dev/null; then
        uri="https://deb.nodesource.com/setup_${NODE_VERSION}.x"
        wutLogOp curl --fail --location --show-error --silent --url "${uri}" '| sudo -E bash'
        if [[ -z "${WUT_NOOP}" ]]; then
          curl --fail --location --show-error --silent --url "${uri}" | sudo -E bash
        fi
      fi
    }

    echo -n '> install node js [system]? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      wutLogOp sudo apt update
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt update
      fi
      wutLogOp sudo apt install nodejs
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt install nodejs
      fi
    fi

    echo -n '> install npm [system]? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      install_nodesource_repo
      wutLogOp sudo apt update
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt update
      fi
      wutLogOp sudo apt install npm
      if [[ -z "${WUT_NOOP}" ]]; then
        sudo apt install npm
      fi
    fi
  fi
fi
