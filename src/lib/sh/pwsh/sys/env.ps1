if (-not "${SYS_CPU_ARCH}") {
  if ($IsWindows) {
    $SYS_CPU_ARCH = ${env:PROCESSOR_ARCHITECTURE}
  } else {
    $SYS_CPU_ARCH = $(uname -m)
  }
  if ("${SYS_CPU_ARCH}") {
    $URL = "${URL}?sysCpuArch=${SYS_CPU_ARCH}"
  }
}

if (-not "${SYS_OS_PLAT}") {
  if ($IsWindows) {
    $SYS_OS_PLAT = 'Windows'
  } elseif ($IsMacOS) {
    $SYS_OS_PLAT = 'Darwin'
  } elseif ($IsLinux) {
    $SYS_OS_PLAT = 'Linux'
  }
  if ("${SYS_OS_PLAT}") {
    $URL = "${URL}&sysOsPlat=${SYS_OS_PLAT}"
  }
}

if ("${SYS_OS_PLAT}" -eq 'Linux') {
  if (Test-Path /etc/os-release) {
    if (-not "${SYS_OS_DIST}") {
      $SYS_OS_DIST = $(grep --only-matching --perl-regexp '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
      if ("${SYS_OS_DIST}") {
        $URL = "${URL}&sysOsDist=${SYS_OS_DIST}"
      }
    }

    if (-not "${SYS_OS_VER}") {
      $SYS_OS_VER = $(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')
      if ("${SYS_OS_VER}") {
        $URL = "${URL}&sysOsVer=${SYS_OS_VER}"
      }
    }
  }
}

if (-not "${SYS_USER}") {
  $SYS_USER = "${env:USER}"
  if ("${SYS_USER}") {
    $URL = "${URL}&sysUser=${SYS_USER}"
  }
}
