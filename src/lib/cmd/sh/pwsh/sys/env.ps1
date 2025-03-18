if (-not $WUT_CPU_ARCH) {
  $WUT_CPU_ARCH=${env:PROCESSOR_ARCHITECTURE}
  if (-not $WUT_CPU_ARCH) {
    $WUT_CPU_ARCH=$(uname -m)
  }
  $WUT_URL="${WUT_URL}&sysCpuArch=${WUT_CPU_ARCH}"
}

if (-not $WUT_OS_PLAT) {
  if ($IsWindows) {
    $WUT_OS_PLAT='windows'
  } elseif ($IsMacOS) {
    $WUT_OS_PLAT='macos'
  } else {
    $WUT_OS_PLAT='linux'
  }
  $WUT_URL="${WUT_URL}&sysOsPlat=${WUT_OS_PLAT}"
}

if (-not $WUT_OS_DIST) {
  if (Test-Path /etc/os-release) {
    $WUT_OS_DIST=$(grep -Po '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
    $WUT_URL="${WUT_URL}&sysOsDist=${WUT_OS_DIST}"

    if (-not $WUT_OS_VER) {
      $WUT_OS_VER=$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | tr -d '"')

      if ($WUT_OS_VER) {
        $WUT_URL="${WUT_URL}&sysOsVer=${WUT_OS_VER}"
      }
    }
  }
}

if (-not $WUT_USER) {
  $WUT_USER="${env:USER}"
  $WUT_URL="${WUT_URL}&sysUser=${WUT_USER}"
}
