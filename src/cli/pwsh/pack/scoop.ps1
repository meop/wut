function packScoop {
  $cmd = 'scoop'
  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? use ${cmd} (user) [y, [n]]"
    }
    if ($yn -ne 'n') {
      packScoopOp $cmd |
      # use Out-Host to skip stdout buffer being copied to function output
      Out-Host
    }
  }
}
