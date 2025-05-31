function packScoopOp ($cmd) {
  if ($PACK_ADD_GROUP_NAMES) {
    foreach ($pg in $PACK_ADD_GROUP_NAMES) {
      $pgSplit = $pg -Split ' '
      opPrintMaybeRunCmd @pgSplit
    }
  }
  opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
  opPrintMaybeRunCmd $cmd install $PACK_ADD_NAMES
}
