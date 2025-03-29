&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_LIST_NAMES}") {
        runOp winget list '6>' '|' Select-String $PACK_LIST_NAMES
      } else {
        runOp winget list
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
        runOp scoop list '6>' '|' Select-String $PACK_LIST_NAMES
      } else {
        runOp scoop list
      }
    }
  }
}
