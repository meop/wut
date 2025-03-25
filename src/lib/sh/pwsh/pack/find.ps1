if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> find packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    logOp winget search $PACK_FIND_NAMES
    if (-not "${NOOP}") {
      winget search $PACK_FIND_NAMES
    }
    $PACK_MANAGER = 'winget'
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> find packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    logOp scoop update
    if (-not "${NOOP}") {
      scoop update
    }
    logOp scoop search $PACK_FIND_NAMES
    if (-not "${NOOP}") {
      scoop search $PACK_FIND_NAMES
    }
    $PACK_MANAGER = 'scoop'
  }
}
