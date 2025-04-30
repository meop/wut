function packBrew {
  $yn = ''
  $cmd = 'brew'

  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? ${PACK_OP} packages with ${cmd} (system) [y, [n]]"
    }
    if ($yn -ne 'n') {
      if ($PACK_OP -eq 'add') {
        if ($PACK_ADD_GROUP_NAMES) {
          foreach ($pg in $PACK_ADD_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintRunCmd @pgSplit
          }
        }
        opPrintRunCmd $cmd update '>' '$null' '2>&1'
        opPrintRunCmd $cmd install $PACK_ADD_NAMES
      } elseif ($PACK_OP -eq 'find') {
        opPrintRunCmd $cmd search $PACK_FIND_NAMES
      } elseif ($PACK_OP -eq 'list') {
        if ($PACK_LIST_NAMES) {
          opPrintRunCmd $cmd list '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd list
        }
      } elseif ($PACK_OP -eq 'out') {
        opPrintRunCmd $cmd update '>' '$null' '2>&1'
        if ($PACK_OUT_NAMES) {
          opPrintRunCmd $cmd outdated '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd outdated
        }
      } elseif ($PACK_OP -eq 'rem') {
        opPrintRunCmd $cmd uninstall $PACK_REM_NAMES
        if ($PACK_REM_GROUP_NAMES) {
          foreach ($pg in $PACK_REM_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintRunCmd @pgSplit
          }
        }
      } elseif ($PACK_OP -eq 'sync') {
        opPrintRunCmd $cmd update '>' '$null' '2>&1'
        if ($PACK_SYNC_NAMES) {
          opPrintRunCmd $cmd upgrade --greedy $PACK_SYNC_NAMES
        } else {
          opPrintRunCmd $cmd upgrade --greedy
        }
      } elseif ($PACK_OP -eq 'tidy') {
        opPrintRunCmd $cmd cleanup --prune=all
      }
    }
  }
}
