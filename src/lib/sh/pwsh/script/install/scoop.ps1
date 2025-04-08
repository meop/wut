&{
  if ($IsWindows) {
    $yn = Read-Host '? install scoop (user) [y, [n]]'
    if ("${yn}" -ne 'n') {
      $url = 'https://get.scoop.sh'
      runOpCond pwsh -c '"Invoke-Expression' '(Invoke-WebRequest' -Uri "${url}" ')"'
    }
  }
}
