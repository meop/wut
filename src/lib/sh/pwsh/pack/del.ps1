if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> del packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    logOp winget uninstall $PACK_DEL_NAMES
    if (-not "${NOOP}") {
      winget uninstall $PACK_DEL_NAMES
    }
    $PACK_MANAGER = 'winget'
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> del packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    logOp scoop uninstall $PACK_DEL_NAMES
    if (-not "${NOOP}") {
      scoop uninstall $PACK_DEL_NAMES
    }
    $PACK_MANAGER = 'scoop'
  }
}
