if [[ -z "${sys_cpu_arch}" ]]; then
  sys_cpu_arch="${(L)$(uname -m)}"
  if [[ "${sys_cpu_arch}" ]]; then
    url="${url}?sysCpuArch=${sys_cpu_arch}"
  fi
fi

if [[ -z "${sys_os_plat}" ]]; then
  sys_os_plat="${(L)$(uname)}"
  if [[ "${sys_os_plat}" ]]; then
    url="${url}&sysOsPlat=${sys_os_plat}"
  fi
fi

if [[ "${sys_os_plat}" == 'linux' ]]; then
  if [[ -f /etc/os-release ]]; then
    if [[ -z "${sys_os_dist}" ]]; then
      sys_os_dist="${(L)$(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)}"
      if [[ "${sys_os_dist}" ]]; then
        url="${url}&sysOsDist=${sys_os_dist}"
      fi
    fi

    if [[ -z "${sys_os_ver}" ]]; then
      sys_os_ver="${(L)$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')}"
      if [[ "${sys_os_ver}" ]]; then
        url="${url}&sysOsVer=${sys_os_ver}"
      fi
    fi
  fi
fi

if [[ -z "${sys_user}" ]]; then
  sys_user="${(L)USER}"
  if [[ "${sys_user}" ]]; then
    url="${url}&sysUser=${sys_user}"
  fi
fi
