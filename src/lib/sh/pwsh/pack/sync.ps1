&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? sync packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${PACK_UP_NAMES}") {
        runOpCond winget upgrade $PACK_UP_NAMES
      } else {
        runOpCond winget upgrade --all
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? sync packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      runOpCond scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      if ("${PACK_UP_NAMES}") {
        runOpCond scoop update $PACK_UP_NAMES
      } else {
        runOpCond scoop update --all
      }
    }
  }
}
