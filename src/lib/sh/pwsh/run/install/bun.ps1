&{
  if ($IsWindows) {
    $yn = Read-Host '? install bun (user) [[y]/n]'
    if ("${yn}" -eq 'y') {
      $url = 'https://bun.sh/install.ps1'
      dynOp pwsh -c '"Invoke-Expression' '(Invoke-WebRequest' -Uri "${url}" ')"'
    }
  }
}
