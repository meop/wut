&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_ADD_PRESETS}") {
        foreach ($preset in ${PACK_ADD_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          runOp @presetSplit
        }
      }
      runOp winget install $PACK_ADD_NAMES
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with scoop (user) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_ADD_PRESETS}") {
        foreach ($preset in ${PACK_ADD_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          runOp @presetSplit
        }
      }
      runOp scoop update
      runOp scoop install $PACK_ADD_NAMES
    }
  }
}
