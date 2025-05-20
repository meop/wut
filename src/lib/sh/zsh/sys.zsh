export SYS_CPU_ARCH="${(L)$(uname -m)}"
export REQ_URL_SH="${REQ_URL_SH}?sysCpuArch=${SYS_CPU_ARCH}"

if type lscpu > /dev/null; then
  export SYS_CPU_VEN_ID="${(L)$(lscpu | grep --ignore-case vendor | cut -d ':' -f 2 | xargs)}"
elif type sysctl > /dev/null; then
  export SYS_CPU_VEN_ID="${(L)$(sysctl machdep.cpu.vendor 2> /dev/null | cut -d ':' -f 2 | xargs)}"
  if [[ -z $SYS_CPU_VEN_ID ]]; then
    export SYS_CPU_VEN_ID="${(L)$(echo 'Apple')}"
  fi
fi
export REQ_URL_SH="${REQ_URL_SH}&sysCpuVenId=${SYS_CPU_VEN_ID}"

export SYS_HOST="${(L)$(hostname)}"
export REQ_URL_SH="${REQ_URL_SH}&sysHost=${SYS_HOST}"

export SYS_OS_PLAT="${(L)$(uname)}"
export REQ_URL_SH="${REQ_URL_SH}&sysOsPlat=${SYS_OS_PLAT}"

if [[ $SYS_OS_PLAT == 'linux' ]]; then
  if [[ -f /etc/os-release ]]; then
    if [[ -z $SYS_OS_ID ]]; then
      export SYS_OS_ID="${(L)$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ $SYS_OS_ID ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsId=${SYS_OS_ID}"
      fi
    fi

    if [[ -z $SYS_OS_VER_ID ]]; then
      export SYS_OS_VER_ID="${(L)$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ $SYS_OS_VER_ID ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsVerId=${SYS_OS_VER_ID}"
      fi
    fi

    if [[ -z $SYS_OS_VER_CODE ]]; then
      export SYS_OS_VER_CODE="${(L)$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')}"
      if [[ $SYS_OS_VER_CODE ]]; then
        export REQ_URL_SH="${REQ_URL_SH}&sysOsVerCode=${SYS_OS_VER_CODE}"
      fi
    fi
  fi
fi

export SYS_USER="${(L)USER}"
export REQ_URL_SH="${REQ_URL_SH}&sysUser=${SYS_USER}"
