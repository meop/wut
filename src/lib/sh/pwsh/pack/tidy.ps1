&{
  # winget will tidy itself

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? tidy packages with scoop (user) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop cleanup --all --cache
    }
  }
}
