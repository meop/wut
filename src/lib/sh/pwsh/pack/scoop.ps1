function packScoop {
  $yn = ''
  $cmd = 'scoop'

  if ((-not $PACK_MANAGER -or $PACK_MANAGER -eq $cmd) -and (Get-Command $cmd -ErrorAction Ignore)) {
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host "? ${PACK_OP} packages with ${cmd} (user) [y, [n]]"
    }
    if ($yn -ne 'n') {
      if ($PACK_OP -eq 'add') {
        if ($PACK_ADD_GROUP_NAMES) {
          foreach ($pg in $PACK_ADD_GROUP_NAMES) {
            $pgSplit = $pg -Split ' '
            opPrintRunCmd @pgSplit
          }
        }
        opPrintRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
        opPrintRunCmd $cmd install $PACK_ADD_NAMES
      } elseif ($PACK_OP -eq 'find') {
        opPrintRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
        opPrintRunCmd $cmd search $PACK_FIND_NAMES
      } elseif ($PACK_OP -eq 'list') {
        if ($PACK_LIST_NAMES) {
          opPrintRunCmd $cmd list '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd list
        }
      } elseif ($PACK_OP -eq 'out') {
        opPrintRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
        if ($PACK_OUT_NAMES) {
          opPrintRunCmd $cmd status '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
        } else {
          opPrintRunCmd $cmd status
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
        opPrintRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
        if ($PACK_SYNC_NAMES) {
          opPrintRunCmd $cmd update $PACK_SYNC_NAMES
        } else {
          opPrintRunCmd $cmd update --all
        }
      } elseif ($PACK_OP -eq 'tidy') {
        opPrintRunCmd $cmd cleanup --all --cache
      }
    }
  }
}
