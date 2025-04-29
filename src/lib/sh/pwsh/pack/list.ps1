&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_LIST_NAMES}") {
        opPrintRunCmd winget list '|' Select-String $env:PACK_LIST_NAMES | ForEach-Object {$_.Line}
      } else {
        opPrintRunCmd winget list
      }
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_LIST_NAMES}") {
        opPrintRunCmd scoop list '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $env:PACK_LIST_NAMES | ForEach-Object {$_.Line}
      } else {
        opPrintRunCmd scoop list
      }
    }
  }
}
