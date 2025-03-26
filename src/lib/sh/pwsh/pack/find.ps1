if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> find packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    printOp winget search $PACK_FIND_NAMES
    if (-not "${NOOP}") {
      winget search $PACK_FIND_NAMES
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> find packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    printOp scoop update
    if (-not "${NOOP}") {
      scoop update
    }
    printOp scoop search $PACK_FIND_NAMES
    if (-not "${NOOP}") {
      scoop search $PACK_FIND_NAMES
    }
  }
}
