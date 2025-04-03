&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with winget (system) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_ADD_PRESETS}") {
        foreach ($preset in ${PACK_ADD_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          dynOp @presetSplit
        }
      }
      dynOp winget install $PACK_ADD_NAMES
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with scoop (user) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_ADD_PRESETS}") {
        foreach ($preset in ${PACK_ADD_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          dynOp @presetSplit
        }
      }
      dynOp scoop update '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '>' $null
      dynOp scoop install $PACK_ADD_NAMES
    }
  }
}
