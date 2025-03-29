&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? del packages with winget (system) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp winget uninstall $PACK_DEL_NAMES
      if ("${PACK_DEL_PRESETS}") {
        foreach ($preset in ${PACK_DEL_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          dynOp @presetSplit
        }
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? del packages with scoop (user) [[y]/n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop uninstall $PACK_DEL_NAMES
      if ("${PACK_DEL_PRESETS}") {
        foreach ($preset in ${PACK_DEL_PRESETS}) {
          $presetSplit = ${preset} -Split ' '
          dynOp @presetSplit
        }
      }
    }
  }
}
