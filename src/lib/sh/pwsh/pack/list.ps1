&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_LIST_NAMES}") {
        dynOp winget list '6>&1' '|' Select-String $PACK_LIST_NAMES
      } else {
        dynOp winget list
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with scoop (user) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_LIST_NAMES}") {
        dynOp scoop list '6>&1' '|' Select-String $PACK_LIST_NAMES
      } else {
        dynOp scoop list
      }
    }
  }
}
