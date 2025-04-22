&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      shRunOpCond winget search $env:PACK_FIND_NAMES
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? find packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      shRunOpCond scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      shRunOpCond scoop search $env:PACK_FIND_NAMES
    }
  }
}
