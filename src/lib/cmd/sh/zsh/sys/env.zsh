if [[ -z "${WUT_CPU_ARCH}" ]]; then
  WUT_CPU_ARCH=$(uname -m)
  WUT_URL="${WUT_URL}&sysCpuArch=${WUT_CPU_ARCH}"
fi

if [[ -z "${WUT_OS_PLAT}" ]]; then
  WUT_OS_PLAT=$(uname)
  WUT_URL="${WUT_URL}&sysOsPlat=${WUT_OS_PLAT}"
fi

if [[ -z "${WUT_OS_DIST}" ]]; then
  if [[ -f /etc/os-release ]]; then
    WUT_OS_DIST=$(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
    WUT_URL="${WUT_URL}&sysOsDist=${WUT_OS_DIST}"

    if [[ -z "${WUT_OS_VER}" ]]; then
      WUT_OS_VER=$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')

      if [[ "${WUT_OS_VER}" ]]; then
        WUT_URL="${WUT_URL}&sysOsVer=${WUT_OS_VER}"
      fi
    fi
  fi
fi

if [[ -z "${WUT_USER}" ]]; then
  WUT_USER="$USER"
  WUT_URL="${WUT_URL}&sysUser=${WUT_USER}"
fi
