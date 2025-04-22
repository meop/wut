&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? rem packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      shRunOpCond winget uninstall $env:PACK_DEL_NAMES
      if ("${env:PACK_DEL_GROUPS}") {
        foreach ($preset in ${env:PACK_DEL_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          shRunOpCond @presetSplit
        }
      }
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? rem packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      shRunOpCond scoop uninstall $env:PACK_DEL_NAMES
      if ("${env:PACK_DEL_GROUPS}") {
        foreach ($preset in ${env:PACK_DEL_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          shRunOpCond @presetSplit
        }
      }
    }
  }
}
