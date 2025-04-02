&{
  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with winget (system) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_LIST_NAMES}") {
        dynOp winget list '|' Select-String $PACK_LIST_NAMES | ForEach-Object {$_.Line}
      } else {
        dynOp winget list
      }
    }
  }

  if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
    if ("${YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? list packages with scoop (user) [[y], n]'
    }
    if ("${yn}" -eq 'y') {
      if ("${PACK_LIST_NAMES}") {
        dynOp scoop list '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_LIST_NAMES | ForEach-Object {$_.Line}
      } else {
        dynOp scoop list
      }
    }
  }
}
