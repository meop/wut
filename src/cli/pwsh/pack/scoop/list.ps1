function packScoopOp ($cmd) {
  if ($PACK_LIST_NAMES) {
    opPrintMaybeRunCmd $cmd list '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
