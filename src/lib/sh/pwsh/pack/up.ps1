if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> up packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_UP_NAMES}") {
      printOp winget upgrade $PACK_UP_NAMES
      if (-not "${NOOP}") {
        winget upgrade $PACK_UP_NAMES
      }
    } else {
      printOp winget upgrade --all
      if (-not "${NOOP}") {
        winget upgrade --all
      }
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> up packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    printOp scoop update
    if (-not "${NOOP}") {
      scoop update
    }
    if ("${PACK_UP_NAMES}") {
      printOp scoop update $PACK_UP_NAMES
      if (-not "${NOOP}") {
        scoop update $PACK_UP_NAMES
      }
    } else {
      printOp scoop update --all
      if (-not "${NOOP}") {
        scoop update --all
      }
    }
  }
}
