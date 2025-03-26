if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? up packages with winget [system] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_UP_NAMES}") {
      runOp winget upgrade $PACK_UP_NAMES
    } else {
      runOp winget upgrade --all
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? up packages with scoop [user] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    runOp scoop update
    if ("${PACK_UP_NAMES}") {
      runOp scoop update $PACK_UP_NAMES
    } else {
      runOp scoop update --all
    }
  }
}
