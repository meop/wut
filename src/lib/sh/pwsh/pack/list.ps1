if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? list packages with winget [system] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_LIST_NAMES}") {
      runOp winget list '|' Select-String -Pattern $PACK_LIST_NAMES
    } else {
      runOp winget list
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? list packages with scoop [user] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_LIST_NAMES}") {
      runOp scoop list '|' Select-String -Pattern $PACK_LIST_NAMES
    } else {
      runOp scoop list
    }
  }
}
