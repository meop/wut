function packWingetOp ($cmd) {
  if ($PACK_ADD_GROUP_NAMES) {
    foreach ($pg in $PACK_ADD_GROUP_NAMES) {
      $pgSplit = $pg -Split ' '
      opPrintMaybeRunCmd @pgSplit
    }
  }
  opPrintMaybeRunCmd $cmd install $PACK_ADD_NAMES
}
