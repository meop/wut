if ($IsWindows) {
  $yn = Read-Host '? install bun [user] (y/N)'
  if ("${yn}" -eq 'y') {
    runOp Invoke-RestMethod -Uri 'https://bun.sh/install.ps1' '|' Invoke-Expression
  }
}
