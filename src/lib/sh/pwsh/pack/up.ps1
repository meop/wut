&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? up packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_UP_NAMES}") {
        dynOp winget upgrade $PACK_UP_NAMES
      } else {
        dynOp winget upgrade --all
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? up packages with scoop (user) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop update '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Out-Null
      if ("${PACK_UP_NAMES}") {
        dynOp scoop update $PACK_UP_NAMES
      } else {
        dynOp scoop update --all
      }
    }
  }
}
