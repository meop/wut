if [[ -z "${SYS_CPU_ARCH}" ]]; then
  SYS_CPU_ARCH=$(uname -m)
  if [[ "${SYS_CPU_ARCH}" ]]; then
    URL="${URL}?sysCpuArch=${SYS_CPU_ARCH}"
  fi
fi

if [[ -z "${SYS_OS_PLAT}" ]]; then
  SYS_OS_PLAT=$(uname)
  if [[ "${SYS_OS_PLAT}" ]]; then
    URL="${URL}&sysOsPlat=${SYS_OS_PLAT}"
  fi
fi

if [[ "${SYS_OS_PLAT}" == 'Linux' ]]; then
  if [[ -f /etc/os-release ]]; then
    if [[ -z "${SYS_OS_DIST}" ]]; then
      SYS_OS_DIST=$(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
      if [[ "${SYS_OS_DIST}" ]]; then
        URL="${URL}&sysOsDist=${SYS_OS_DIST}"
      fi
    fi

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
  if [[ "${SYS_USER}" ]]; then
    URL="${URL}&sysUser=${SYS_USER}"
  fi
fi
