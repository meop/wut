function packWingetOp ($cmd) {
  opPrintMaybeRunCmd $cmd uninstall $PACK_REM_NAMES
  if ($PACK_REM_GROUP_NAMES) {
    foreach ($pg in $PACK_REM_GROUP_NAMES) {
      $pgSplit = $pg -split ' '
      opPrintMaybeRunCmd @pgSplit
    }
  }
}
