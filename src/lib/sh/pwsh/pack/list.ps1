if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> list packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_LIST_NAMES}") {
      logOp winget list '|' Select-String -Pattern $PACK_LIST_NAMES
      if (-not "${NOOP}") {
        winget list | Select-String -Pattern $PACK_LIST_NAMES
      }
    } else {
      logOp winget list
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
      logOp scoop list '|' Select-String -Pattern $PACK_LIST_NAMES
      if (-not "${NOOP}") {
        scoop list | Select-String -Pattern $PACK_LIST_NAMES
      }
    } else {
      logOp scoop list
      if (-not "${NOOP}") {
        scoop list
      }
    }
  }
}
