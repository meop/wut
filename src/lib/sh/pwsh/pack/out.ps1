&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with winget (system) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_OUT_NAMES}") {
        dynOp winget upgrade '|' Select-String $PACK_OUT_NAMES | ForEach-Object {$_.Line}
      } else {
        dynOp winget upgrade
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? out packages with scoop (user) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      dynOp scoop update '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '>' $null
      if ("${PACK_OUT_NAMES}") {
        dynOp scoop status '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_OUT_NAMES | ForEach-Object {$_.Line}
      } else {
        dynOp scoop status
      }
    }
  }
}
