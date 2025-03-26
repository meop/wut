if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> out packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_OUT_NAMES}") {
      printOp winget upgrade '|' Select-String -Pattern $PACK_OUT_NAMES
      if (-not "${NOOP}") {
        winget upgrade | Select-String -Pattern $PACK_OUT_NAMES
      }
    } else {
      printOp winget upgrade
      if (-not "${NOOP}") {
        winget upgrade
      }
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> out packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    printOp scoop update
    if (-not "${NOOP}") {
      scoop update
    }
    if ("${PACK_OUT_NAMES}") {
      printOp scoop status '|' Select-String -Pattern $PACK_OUT_NAMES
      if (-not "${NOOP}") {
        scoop status | Select-String -Pattern $PACK_OUT_NAMES
      }
    } else {
      printOp scoop status
      if (-not "${NOOP}") {
        scoop status
      }
    }
  }
}
