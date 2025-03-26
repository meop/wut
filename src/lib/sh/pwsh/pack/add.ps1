if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> add packages with winget [system]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ($PACK_ADD_PRESET) {
      printOp Invoke-Expression $PACK_ADD_PRESET
      if (-not "${NOOP}") {
        Invoke-Expression $PACK_ADD_PRESET
      }
    }
    printOp winget install $PACK_ADD_NAMES
    if (-not "${NOOP}") {
      winget install $PACK_ADD_NAMES
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '> add packages with scoop [user]? (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ($PACK_ADD_PRESET) {
      printOp Invoke-Expression $PACK_ADD_PRESET
      if (-not "${NOOP}") {
        Invoke-Expression $PACK_ADD_PRESET
      }
    }
    printOp scoop update
    if (-not "${NOOP}") {
      scoop update
    }
    printOp scoop install $PACK_ADD_NAMES
    if (-not "${NOOP}") {
      scoop install $PACK_ADD_NAMES
    }
  }
}
