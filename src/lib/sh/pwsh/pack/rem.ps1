&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? rem packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      runOpCond winget uninstall $PACK_DEL_NAMES
      if ("${PACK_DEL_GROUPS}") {
        foreach ($preset in ${PACK_DEL_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          runOpCond @presetSplit
        }
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? rem packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      runOpCond scoop uninstall $PACK_DEL_NAMES
      if ("${PACK_DEL_GROUPS}") {
        foreach ($preset in ${PACK_DEL_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          runOpCond @presetSplit
        }
      }
    }
  }
}
