&{
  if ($IsWindows) {
    $yn = Read-Host '? install scoop (user) [y/N]'
    if ("${yn}" -eq 'y') {
      $url = 'https://get.scoop.sh'
      runOp pwsh -c '"Invoke-Expression' '(Invoke-WebRequest' -Uri "${url}" ')"'
    }
  }
}
