&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? install scoop (user) [y, [n]]'
    }
    if ($yn -ne 'n') {
      $url = 'https://get.scoop.sh'
      opPrintMaybeRunCmd Invoke-Expression '"$(' Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${url}" ')"'
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
