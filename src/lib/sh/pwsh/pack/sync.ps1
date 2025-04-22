&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? sync packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_UP_NAMES}") {
        shRunOpCond winget upgrade $env:PACK_UP_NAMES
      } else {
        shRunOpCond winget upgrade --all
      }
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? sync packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      shRunOpCond scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      if ("${env:PACK_UP_NAMES}") {
        shRunOpCond scoop update $env:PACK_UP_NAMES
      } else {
        shRunOpCond scoop update --all
      }
    }
  }
}
