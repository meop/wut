if (-not "${sys_cpu_arch}") {
  if ($IsWindows) {
    $sys_cpu_arch = "${env:PROCESSOR_ARCHITECTURE}".ToLower()
  } else {
    $sys_cpu_arch = "$(uname -m)".ToLower()
  }
  if ("${sys_cpu_arch}") {
    $url = "${url}?sysCpuArch=${sys_cpu_arch}"
  }
}

if (-not "${sys_os_plat}") {
  if ($IsWindows) {
    $sys_os_plat = 'winnt'
  } elseif ($IsMacOS) {
    $sys_os_plat = 'darwin'
  } elseif ($IsLinux) {
    $sys_os_plat = 'linux'
  }
  if ("${sys_os_plat}") {
    $url = "${url}&sysOsPlat=${sys_os_plat}"
  }
}

if ("${sys_os_plat}" -eq 'linux') {
  if (Test-Path /etc/os-release) {
    if (-not "${sys_os_dist}") {
      $sys_os_dist = "$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')".ToLower()
      if ("${sys_os_dist}") {
        $url = "${url}&sysOsDist=${sys_os_dist}"
      }
    }

    if (-not "${sys_os_ver_id}") {
      $sys_os_ver_id = "$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')".ToLower()
      if ("${sys_os_ver_id}") {
        $url = "${url}&sysOsVerId=${sys_os_ver_id}"
      }
    }

    if (-not "${sys_os_ver_code}") {
      $sys_os_ver_code = "$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')".ToLower()
      if ("${sys_os_ver_code}") {
        $url = "${url}&sysOsVerCode=${sys_os_ver_code}"
      }
    }
  }
}

if (-not "${sys_host}") {
  if ($IsWindows) {
    $sys_host = "${env:COMPUTERNAME}".ToLower()
  } else {
    $sys_host = "$(hostname)".ToLower()
  }
  if ("${sys_host}") {
    $url = "${url}&sysHost=${sys_host}"
  }
}

if (-not "${sys_user}") {
  $sys_user = "${USER}".ToLower()
  if ("${sys_user}") {
    $url = "${url}&sysUser=${sys_user}"
  }
}
