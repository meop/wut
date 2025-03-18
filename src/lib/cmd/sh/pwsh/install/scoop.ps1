if ($IsWindows) {
  $yn = Read-Host '> install scoop [user]? (y/N)'
  if ("${yn}" -eq 'y') {
    Invoke-RestMethod -Uri 'https://get.scoop.sh' | Invoke-Expression
  }
}
