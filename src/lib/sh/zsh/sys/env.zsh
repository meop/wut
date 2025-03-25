if [[ -z "${SYS_CPU_ARCH}" ]]; then
  SYS_CPU_ARCH=$(uname -m)
  URL="${URL}&sysCpuArch=${SYS_CPU_ARCH}"
fi

if [[ -z "${SYS_OS_PLAT}" ]]; then
  SYS_OS_PLAT=$(uname)
  URL="${URL}&sysOsPlat=${SYS_OS_PLAT}"
fi

if [[ -z "${SYS_OS_DIST}" ]]; then
  if [[ -f /etc/os-release ]]; then
    SYS_OS_DIST=$(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
    URL="${URL}&sysOsDist=${SYS_OS_DIST}"

    if [[ -z "${SYS_OS_VER}" ]]; then
      SYS_OS_VER=$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')

      if [[ "${SYS_OS_VER}" ]]; then
        URL="${URL}&sysOsVer=${SYS_OS_VER}"
      fi
    fi
  fi
fi

if [[ -z "${SYS_USER}" ]]; then
  SYS_USER="$USER"
  URL="${URL}&sysUser=${SYS_USER}"
fi
