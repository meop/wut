if (-not "${SYS_CPU_ARCH}") {
  $SYS_CPU_ARCH=${env:PROCESSOR_ARCHITECTURE}
  if (-not "${SYS_CPU_ARCH}") {
    $SYS_CPU_ARCH=$(uname -m)
  }
  $URL="${URL}&sysCpuArch=${SYS_CPU_ARCH}"
}

if (-not "${SYS_OS_PLAT}") {
  if ($IsWindows) {
    $SYS_OS_PLAT='windows'
  } elseif ($IsMacOS) {
    $SYS_OS_PLAT='macos'
  } else {
    $SYS_OS_PLAT='linux'
  }
  $URL="${URL}&sysOsPlat=${SYS_OS_PLAT}"
}

if (-not "${SYS_OS_DIST}") {
  if (Test-Path /etc/os-release) {
    $SYS_OS_DIST=$(grep -Po '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
    $URL="${URL}&sysOsDist=${SYS_OS_DIST}"

    if (-not "${SYS_OS_VER}") {
      $SYS_OS_VER=$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')

      if ("${SYS_OS_VER}") {
        $URL="${URL}&sysOsVer=${SYS_OS_VER}"
      }
    }
  }
}

if (-not "${SYS_USER}") {
  $SYS_USER="${env:USER}"
  $URL="${URL}&sysUser=${SYS_USER}"
}
