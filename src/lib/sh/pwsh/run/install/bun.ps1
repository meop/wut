if ($IsWindows) {
  $yn = Read-Host '> install bun [user]? (y/N)'
  if ("${yn}" -eq 'y') {
    Invoke-RestMethod -Uri 'https://bun.sh/install.ps1' | Invoke-Expression
  }
}
