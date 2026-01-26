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
      if ($PACK_OP -and ($PACK_OP -eq 'add' -or $PACK_OP -eq 'find' -or $PACK_OP -eq 'out' -or $PACK_OP -eq 'sync')) {
        opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' |
          # use Out-Host to skip stdout buffer being copied to function output
          Out-Host
      }
      packScoopOp $cmd |
        # use Out-Host to skip stdout buffer being copied to function output
        Out-Host
    }
  }
}
