&{
  if ($IsWindows) {
    $yn = Read-Host '? install scoop (user) [n/[y]]'
    if ("${yn}" -eq 'y') {
      $url = 'https://get.scoop.sh'
      dynOp pwsh -c '"Invoke-Expression' '(Invoke-WebRequest' -Uri "${url}" ')"'
    }
  }
}
