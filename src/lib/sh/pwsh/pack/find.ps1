&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with winget (system) [y/N]'
    }
    if ("${yn}" -eq 'y') {
      runOp winget search $PACK_FIND_NAMES
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with scoop (user) [y/N]'
    }
    if ("${yn}" -eq 'y') {
      runOp scoop update
      runOp scoop search $PACK_FIND_NAMES
    }
  }
}
