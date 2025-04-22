&{
  if ($IsWindows) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? install bun (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      $url = 'https://bun.sh/install.ps1'
      shRunOpCond pwsh -c '"$(Invoke-WebRequest' -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${url}"')"'
    }
  }
}
