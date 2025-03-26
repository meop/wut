if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'winget') -and (Get-Command winget -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? out packages with winget [system] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    if ("${PACK_OUT_NAMES}") {
      runOp winget upgrade '|' Select-String -Pattern $PACK_OUT_NAMES
    } else {
      runOp winget upgrade
    }
  }
}

if ((-not "${PACK_MANAGER}" -or "${PACK_MANAGER}" -eq 'scoop') -and (Get-Command scoop -ErrorAction Ignore)) {
  if ("${YES}") {
    $yn = 'y'
  } else {
    $yn = Read-Host '? out packages with scoop [user] (y/N)'
  }
  if ("${yn}" -eq 'y') {
    runOp scoop update
    if ("${PACK_OUT_NAMES}") {
      runOp scoop status '|' Select-String -Pattern $PACK_OUT_NAMES
    } else {
      runOp scoop status
    }
  }
}
