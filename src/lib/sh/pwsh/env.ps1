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
      $sys_os_dist = "$(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)".ToLower()
      if ("${sys_os_dist}") {
        $url = "${url}&sysOsDist=${sys_os_dist}"
      }
    }

    if (-not "${sys_os_ver}") {
      $sys_os_ver = "$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')".ToLower()
      if ("${sys_os_ver}") {
        $url = "${url}&sysOsVer=${sys_os_ver}"
      }
    }
  }
}

if (-not "${sys_user}") {
  $sys_user = "${USER}".ToLower()
  if ("${sys_user}") {
    $url = "${url}&sysUser=${sys_user}"
  }
}
