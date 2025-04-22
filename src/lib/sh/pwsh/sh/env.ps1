if (-not "${env:SYS_CPU_ARCH}") {
  if ($IsWindows) {
    $env:SYS_CPU_ARCH = "${env:PROCESSOR_ARCHITECTURE}".ToLower()
  } else {
    $env:SYS_CPU_ARCH = "$(uname -m)".ToLower()
  }
  if ("${env:SYS_CPU_ARCH}") {
    $env:REQ_URL_SH = "${env:REQ_URL_SH}?sysCpuArch=${env:SYS_CPU_ARCH}"
  }
}

if (-not "${env:SYS_CPU_VEN_ID}") {
  if ($IsWindows) {
    $env:SYS_CPU_VEN_ID = "${env:PROCESSOR_ARCHITECTURE}".ToLower()
  } elseif ($IsLinux) {
    $env:SYS_CPU_VEN_ID = "$(lscpu | grep --ignore-case vendor | cut -d ':' -f 2 | xargs)".ToLower()
  } else {
    $env:SYS_CPU_VEN_ID = "$(sysctl machdep.cpu.vendor 2> /dev/null | cut -d ':' -f 2 | xargs)".ToLower()
    if (-not "${env:SYS_CPU_VEN_ID}") {
      $env:SYS_CPU_VEN_ID = 'Apple'.ToLower()
    }
  }
  if ("${env:SYS_CPU_VEN_ID}") {
    $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysCpuVenId=${env:SYS_CPU_VEN_ID}"
  }
}

if (-not "${env:SYS_HOST}") {
  if ($IsWindows) {
    $env:SYS_HOST = "${env:COMPUTERNAME}".ToLower()
  } else {
    $env:SYS_HOST = "$(hostname)".ToLower()
  }
  if ("${env:SYS_HOST}") {
    $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysHost=${env:SYS_HOST}"
  }
}

if (-not "${env:SYS_OS_PLAT}") {
  if ($IsWindows) {
    $env:SYS_OS_PLAT = 'windows'
  } elseif ($IsMacOS) {
    $env:SYS_OS_PLAT = 'macos'
  } elseif ($IsLinux) {
    $env:SYS_OS_PLAT = 'linux'
  }
  if ("${env:SYS_OS_PLAT}") {
    $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysOsPlat=${env:SYS_OS_PLAT}"
  }
}

if ("${env:SYS_OS_PLAT}" -eq 'linux') {
  if (Test-Path /etc/os-release) {
    if (-not "${env:SYS_OS_ID}") {
      $env:SYS_OS_ID = "$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ("${env:SYS_OS_ID}") {
        $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysOsId=${env:SYS_OS_ID}"
      }
    }

    if (-not "${env:sys_os_ver_id}") {
      $env:sys_os_ver_id = "$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ("${env:sys_os_ver_id}") {
        $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysOsVerId=${env:sys_os_ver_id}"
      }
    }

    if (-not "${env:SYS_OS_VER_CODE}") {
      $env:SYS_OS_VER_CODE = "$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ("${env:SYS_OS_VER_CODE}") {
        $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysOsVerCode=${env:SYS_OS_VER_CODE}"
      }
    }
  }
}

if (-not "${env:SYS_USER}") {
  $env:SYS_USER = "${env:USER}".ToLower()
  if ("${env:SYS_USER}") {
    $env:REQ_URL_SH = "${env:REQ_URL_SH}&sysUser=${env:SYS_USER}"
  }
}
