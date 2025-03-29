&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_OUT_NAMES}") {
        dynOp winget upgrade '6>&1' '|' Select-String $PACK_OUT_NAMES
      } else {
        dynOp winget upgrade
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with scoop (user) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop update
      if ("${PACK_OUT_NAMES}") {
        dynOp scoop status '6>&1' '|' Select-String $PACK_OUT_NAMES
      } else {
        dynOp scoop status
      }
    }
  }
}
