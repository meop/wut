if ($IsWindows) {
  $SYS_CPU_ARCH = "${env:PROCESSOR_ARCHITECTURE}".ToLower()
} else {
  $SYS_CPU_ARCH = "$(uname -m)".ToLower()
}
$REQ_URL_SH = "${REQ_URL_SH}?sysCpuArch=${SYS_CPU_ARCH}"

if ($IsWindows) {
  $SYS_CPU_VEN_ID = "${env:PROCESSOR_ARCHITECTURE}".ToLower()
} elseif ($IsLinux) {
  $SYS_CPU_VEN_ID = "$(lscpu | grep --ignore-case vendor | cut -d ':' -f 2 | xargs)".ToLower()
} else {
  $SYS_CPU_VEN_ID = "$(sysctl machdep.cpu.vendor 2> /dev/null | cut -d ':' -f 2 | xargs)".ToLower()
  if (-not $SYS_CPU_VEN_ID) {
    $SYS_CPU_VEN_ID = 'Apple'.ToLower()
  }
}
$REQ_URL_SH = "${REQ_URL_SH}&sysCpuVenId=${SYS_CPU_VEN_ID}"

if ($IsWindows) {
  $SYS_HOST = "${env:COMPUTERNAME}".ToLower()
} else {
  $SYS_HOST = "$(hostname)".ToLower()
}
$REQ_URL_SH = "${REQ_URL_SH}&sysHost=${SYS_HOST}"

if ($IsWindows) {
  $SYS_OS_PLAT = 'winnt'
} elseif ($IsMacOS) {
  $SYS_OS_PLAT = 'darwin'
} elseif ($IsLinux) {
  $SYS_OS_PLAT = 'linux'
}
$REQ_URL_SH = "${REQ_URL_SH}&sysOsPlat=${SYS_OS_PLAT}"

if ($SYS_OS_PLAT -eq 'linux') {
  if (Test-Path /etc/os-release) {
    if (-not $SYS_OS_ID) {
      $SYS_OS_ID = "$(grep '^ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ($SYS_OS_ID) {
        $REQ_URL_SH = "${REQ_URL_SH}&sysOsId=${SYS_OS_ID}"
      }
    }

    if (-not $SYS_OS_VER_ID) {
      $SYS_OS_VER_ID = "$(grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ($SYS_OS_VER_ID) {
        $REQ_URL_SH = "${REQ_URL_SH}&sysOsVerId=${SYS_OS_VER_ID}"
      }
    }

    if (-not $SYS_OS_VER_CODE) {
      $SYS_OS_VER_CODE = "$(grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"')".ToLower()
      if ($SYS_OS_VER_CODE) {
        $REQ_URL_SH = "${REQ_URL_SH}&sysOsVerCode=${SYS_OS_VER_CODE}"
      }
    }
  }
}

$SYS_USER = "${USER}".ToLower()
$REQ_URL_SH = "${REQ_URL_SH}&sysUser=${SYS_USER}"
