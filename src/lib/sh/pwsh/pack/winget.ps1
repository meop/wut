function packWinget {
  $yn = ''

  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    $cmd = 'winget'
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? use ${cmd} (system) [y, [n]]"
    }
    if ($yn -ne 'n') {
      packWingetOp $cmd
    }
  }
}
