&{
  if ($IsWindows) {
    $yn = Read-Host '? install bun (user) [y, [n]]'
    if ("${yn}" -ne 'n') {
      $url = 'https://bun.sh/install.ps1'
      runOpCond pwsh -c '"Invoke-Expression' '(Invoke-WebRequest' -Uri "${url}" ')"'
    }
  }
}
