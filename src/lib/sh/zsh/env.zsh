if [[ -z "${sys_cpu_arch}" ]]; then
  sys_cpu_arch="${(L)$(uname -m)}"
  if [[ "${sys_cpu_arch}" ]]; then
    req_url_sh="${req_url_sh}?sysCpuArch=${sys_cpu_arch}"
  fi
fi

if [[ -z "${sys_os_plat}" ]]; then
  sys_os_plat="${(L)$(uname)}"
  if [[ "${sys_os_plat}" ]]; then
    req_url_sh="${req_url_sh}&sysOsPlat=${sys_os_plat}"
  fi
fi

if [[ "${sys_os_plat}" == 'linux' ]]; then
  if [[ -f /etc/os-release ]]; then
    if [[ -z "${sys_os_dist}" ]]; then
      sys_os_dist="${(L)$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')}"
      if [[ "${sys_os_dist}" ]]; then
        req_url_sh="${req_url_sh}&sysOsDist=${sys_os_dist}"
      fi
    fi

    if [[ -z "${sys_os_ver_id}" ]]; then
      sys_os_ver_id="${(L)$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')}"
      if [[ "${sys_os_ver_id}" ]]; then
        req_url_sh="${req_url_sh}&sysOsVerId=${sys_os_ver_id}"
      fi
    fi

    if [[ -z "${sys_os_ver_code}" ]]; then
      sys_os_ver_code="${(L)$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')}"
      if [[ "${sys_os_ver_code}" ]]; then
        req_url_sh="${req_url_sh}&sysOsVerCode=${sys_os_ver_code}"
      fi
    fi
  fi
fi

if [[ -z "${sys_host}" ]]; then
  sys_host="${(L)$(hostname)}"
  if [[ "${sys_host}" ]]; then
    req_url_sh="${req_url_sh}&sysHost=${sys_host}"
  fi
fi

if [[ -z "${sys_user}" ]]; then
  sys_user="${(L)USER}"
  if [[ "${sys_user}" ]]; then
    req_url_sh="${req_url_sh}&sysUser=${sys_user}"
  fi
fi
