&{
  # winget does not need tidy

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? tidy packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      opPrintRunCmd scoop cleanup --all --cache
    }
  }
}
