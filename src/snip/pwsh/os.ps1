$arch=${env:PROCESSOR_ARCHITECTURE}

if (-not $arch) {
  $arch=$(uname -m)
}

if ($IsWindows) {
  $plat='windows'
} elseif ($IsMacOS) {
  $plat='macos'
} else {
  $plat='linux'
}

$fullUrl="${urlStr}?arch=${arch}&plat=${plat}"

if (Test-Path /etc/os-release) {
  $OS_ID=$(grep -Po '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)
  $fullUrl="${fullUrl}&dist=${OS_ID}"
}
