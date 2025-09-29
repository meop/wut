function packChoco {
  $cmd = 'choco'
  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? use ${cmd} (system) [y, [n]]"
    }
    if ($yn -ne 'n') {
      $cmd = if (Get-Command $cmd -ErrorAction Ignore) { "sudo ${cmd}" } else { $cmd }
      packChocoOp $cmd |
        # use Out-Host to skip stdout buffer being copied to function output
        Out-Host
    }
  }
}
