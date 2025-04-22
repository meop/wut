if [[ -z "${SYS_CPU_ARCH}" ]]; then
  export SYS_CPU_ARCH="${(L)$(uname -m)}"
  if [[ "${SYS_CPU_ARCH}" ]]; then
    export REQ_URL_SH="${REQ_URL_SH}?sysCpuArch=${SYS_CPU_ARCH}"
  fi
fi

if [[ -z "${SYS_CPU_VEN_ID}" ]]; then
  if type lscpu > /dev/null; then
    export SYS_CPU_VEN_ID="${(L)$(lscpu | grep --ignore-case vendor | cut -d ':' -f 2 | xargs)}"
  elif type sysctl > /dev/null; then
    export SYS_CPU_VEN_ID="${(L)$(sysctl machdep.cpu.vendor 2> /dev/null | cut -d ':' -f 2 | xargs)}"
    if [[ -z "${SYS_CPU_VEN_ID}" ]]; then
      export SYS_CPU_VEN_ID="${(L)$(echo 'Apple')}"
    fi
  fi
  if [[ "${SYS_CPU_VEN_ID}" ]]; then
    export REQ_URL_SH="${REQ_URL_SH}&sysCpuVenId=${SYS_CPU_VEN_ID}"
  fi
fi

if [[ -z "${SYS_HOST}" ]]; then
  export SYS_HOST="${(L)$(hostname)}"
  if [[ "${SYS_HOST}" ]]; then
    export REQ_URL_SH="${REQ_URL_SH}&sysHost=${SYS_HOST}"
  fi
fi

if [[ -z "${SYS_OS_PLAT}" ]]; then
  export SYS_OS_PLAT="${(L)$(uname)}"
  if [[ "${SYS_OS_PLAT}" ]]; then
    export REQ_URL_SH="${REQ_URL_SH}&sysOsPlat=${SYS_OS_PLAT}"
  fi
fi

if [[ "${SYS_OS_PLAT}" == 'linux' ]]; then
  if [[ -f /etc/os-release ]]; then
    if [[ -z "${SYS_OS_ID}" ]]; then
      export SYS_OS_ID="${(L)$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ "${SYS_OS_ID}" ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsId=${SYS_OS_ID}"
      fi
    fi

    if [[ -z "${sys_os_ver_id}" ]]; then
      export sys_os_ver_id="${(L)$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ "${sys_os_ver_id}" ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsVerId=${sys_os_ver_id}"
      fi
    fi

    if [[ -z "${SYS_OS_VER_CODE}" ]]; then
      export SYS_OS_VER_CODE="${(L)$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ "${SYS_OS_VER_CODE}" ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsVerCode=${SYS_OS_VER_CODE}"
      fi
    fi
  fi
fi

if [[ -z "${SYS_USER}" ]]; then
  export SYS_USER="${(L)USER}"
  if [[ "${SYS_USER}" ]]; then
    export REQ_URL_SH="${REQ_URL_SH}&sysUser=${SYS_USER}"
  fi
fi
