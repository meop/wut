&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with winget (system) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp winget search $PACK_FIND_NAMES
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with scoop (user) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      dynOp scoop search $PACK_FIND_NAMES
    }
  }
}
