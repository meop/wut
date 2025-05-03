function packAptget {
  $yn = ''
  $cmd = 'apt-get'

  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    if (-not $PACK_MANAGER -and (Get-Command apt -ErrorAction Ignore)) {
      $yn = 'n'
    } elseif ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? ${PACK_OP} packages with ${cmd} (system) [y, [n]]"
    }
    if ($yn -ne 'n') {
      if (Get-Command sudo -ErrorAction Ignore) {
        $cmd = "sudo ${cmd}"
      }
      if ($PACK_OP -eq 'add') {
        if ($PACK_ADD_GROUP_NAMES) {
          foreach ($pg in $PACK_ADD_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintMaybeRunCmd @pgSplit
          }
        }
        opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1'
        opPrintMaybeRunCmd $cmd install $PACK_ADD_NAMES
      } elseif ($PACK_OP -eq 'find') {
        opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1'
        $cacheCmd = 'apt-cache'
        if (Get-Command sudo -ErrorAction Ignore) {
          $cacheCmd = "sudo ${cacheCmd}"
        }
        opPrintMaybeRunCmd $cacheCmd search $PACK_FIND_NAMES
      } elseif ($PACK_OP -eq 'list') {
        if ($PACK_LIST_NAMES) {
          opPrintMaybeRunCmd $cmd list --installed '2>' '$null' '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintMaybeRunCmd $cmd list --installed
        }
      } elseif ($PACK_OP -eq 'out') {
        opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1'
        if ($PACK_OUT_NAMES) {
          opPrintMaybeRunCmd $cmd list --upgradable '2>' '$null' '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintMaybeRunCmd $cmd list --upgradable
        }
      } elseif ($PACK_OP -eq 'rem') {
        opPrintMaybeRunCmd $cmd purge $PACK_REM_NAMES
        if ($PACK_REM_GROUP_NAMES) {
          foreach ($pg in $PACK_REM_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintMaybeRunCmd @pgSplit
          }
        }
      } elseif ($PACK_OP -eq 'sync') {
        opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1'
        if ($PACK_SYNC_NAMES) {
          opPrintMaybeRunCmd $cmd install $PACK_SYNC_NAMES
        } else {
          opPrintMaybeRunCmd $cmd dist-upgrade
        }
      } elseif ($PACK_OP -eq 'tidy') {
        opPrintMaybeRunCmd $cmd autoclean
        opPrintMaybeRunCmd $cmd autoremove
      }
    }
  }
}
