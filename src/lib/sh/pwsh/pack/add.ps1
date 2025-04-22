&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_ADD_GROUPS}") {
        foreach ($preset in ${env:PACK_ADD_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          shRunOpCond @presetSplit
        }
      }
      shRunOpCond winget install $env:PACK_ADD_NAMES
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? add packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_ADD_GROUPS}") {
        foreach ($preset in ${env:PACK_ADD_GROUPS}) {
          $presetSplit = ${preset} -Split ' '
          shRunOpCond @presetSplit
        }
      }
      shRunOpCond scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      shRunOpCond scoop install $env:PACK_ADD_NAMES
    }
  }
}
