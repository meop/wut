function packChocoOp ($cmd) {
  if ($PACK_LIST_NAMES) {
    opPrintMaybeRunCmd $cmd list '|' Select-String $PACK_LIST_NAMES '|' Select-Object -ExpandProperty Line
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
