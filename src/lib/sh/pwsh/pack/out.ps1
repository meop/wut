&{
  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with winget (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      if ("${env:PACK_OUT_NAMES}") {
        opPrintRunCmd winget upgrade '|' Select-String $env:PACK_OUT_NAMES | ForEach-Object {$_.Line}
      } else {
        opPrintRunCmd winget upgrade
      }
    }
  }

  if ((-not "${env:PACK_MANAGER}" -or "${env:PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with scoop (user) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      opPrintRunCmd scoop update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
      if ("${env:PACK_OUT_NAMES}") {
        opPrintRunCmd scoop status '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $env:PACK_OUT_NAMES | ForEach-Object {$_.Line}
      } else {
        opPrintRunCmd scoop status
      }
    }
  }
}
