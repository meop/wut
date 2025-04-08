&{
  # winget does not need tidy

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? tidy packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      runOpCond scoop cleanup --all --cache
    }
  }
}
