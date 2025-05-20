$env.SYS_CPU_ARCH = uname | get machine | str downcase
$env.REQ_URL_SH = $"($env.REQ_URL_SH)?sysCpuArch=($env.SYS_CPU_ARCH)"

$env.SYS_CPU_VEN_ID = sys cpu | first | get vendor_id | str downcase
$env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysCpuVenId=($env.SYS_CPU_VEN_ID)"

$env.SYS_HOST = sys host | get hostname | str downcase
$env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysHost=($env.SYS_HOST)"

$env.SYS_OS_PLAT = uname | get kernel-name | str downcase
$env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysOsPlat=($env.SYS_OS_PLAT)"

if $env.SYS_OS_PLAT == 'linux' {
  if ('/etc/os-release' | path exists) {
    if 'SYS_OS_ID' not-in $env {
      $env.SYS_OS_ID = (grep '^ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"') | str downcase
      if ($env.SYS_OS_ID | is-not-empty) {
        $env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysOsId=($env.SYS_OS_ID)"
      }
    }

    if 'SYS_OS_VER_ID' not-in $env {
      $env.SYS_OS_VER_ID = (grep '^VERSION_ID=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"') | str downcase
      if ($env.SYS_OS_VER_ID | is-not-empty) {
        $env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysOsVerId=($env.SYS_OS_VER_ID)"
      }
    }

    if 'SYS_OS_VER_CODE' not-in $env {
      $env.SYS_OS_VER_CODE = (grep '^VERSION_CODENAME=' /etc/os-release | cut -d '=' -f 2 | xargs | tr -d '"') | str downcase
      if ($env.SYS_OS_VER_CODE | is-not-empty) {
        $env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysOsVerCode=($env.SYS_OS_VER_CODE)"
      }
    }
  }
}

$env.SYS_USER = whoami | str downcase
$env.REQ_URL_SH = $"($env.REQ_URL_SH)&sysUser=($env.SYS_USER)"
