&{
  if ($IsWindows) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? install scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      $url = 'https://get.scoop.sh'
      shRunOpCond pwsh -c '"$(Invoke-WebRequest' -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${url}"')"'
    }
  }
}
