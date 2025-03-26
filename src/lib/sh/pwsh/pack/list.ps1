if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> list packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_LIST_NAMES}") {
      printOp winget list '|' Select-String -Pattern $PACK_LIST_NAMES
      if (-not "${NOOP}") {
        winget list | Select-String -Pattern $PACK_LIST_NAMES
      }
    } else {
      printOp winget list
      if (-not "${NOOP}") {
        winget list
      }
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> list packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_LIST_NAMES}") {
      printOp scoop list '|' Select-String -Pattern $PACK_LIST_NAMES
      if (-not "${NOOP}") {
        scoop list | Select-String -Pattern $PACK_LIST_NAMES
      }
    } else {
      printOp scoop list
      if (-not "${NOOP}") {
        scoop list
      }
    }
  }
}
