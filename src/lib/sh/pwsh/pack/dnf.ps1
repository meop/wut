function packDnf {
  $yn = ''
  $cmd = 'dnf'

  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    if ($YES) {
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
            opPrintRunCmd @pgSplit
          }
        }
        opPrintRunCmd $cmd check-update '>' '$null' '2>&1'
        opPrintRunCmd $cmd install $PACK_ADD_NAMES
      } elseif ($PACK_OP -eq 'find') {
        opPrintRunCmd $cmd check-update '>' '$null' '2>&1'
        opPrintRunCmd $cmd search $PACK_FIND_NAMES
      } elseif ($PACK_OP -eq 'list') {
        if ($PACK_LIST_NAMES) {
          opPrintRunCmd $cmd list --installed '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd list --installed
        }
      } elseif ($PACK_OP -eq 'out') {
        opPrintRunCmd $cmd check-update '>' '$null' '2>&1'
        if ($PACK_OUT_NAMES) {
          opPrintRunCmd $cmd list --upgrades '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd list --upgrades
        }
      } elseif ($PACK_OP -eq 'rem') {
        opPrintRunCmd $cmd remove $PACK_REM_NAMES
        if ($PACK_REM_GROUP_NAMES) {
          foreach ($pg in $PACK_REM_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintRunCmd @pgSplit
          }
        }
      } elseif ($PACK_OP -eq 'sync') {
        opPrintRunCmd $cmd check-update '>' '$null' '2>&1'
        if ($PACK_SYNC_NAMES) {
          opPrintRunCmd $cmd upgrade $PACK_SYNC_NAMES
        } else {
          opPrintRunCmd $cmd distro-sync
        }
      } elseif ($PACK_OP -eq 'tidy') {
        opPrintRunCmd $cmd clean dbcache
        opPrintRunCmd $cmd autoremove
      }
    }
  }
}
