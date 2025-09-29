function packChocoOp ($cmd) {
  if ($PACK_OUT_NAMES) {
    opPrintMaybeRunCmd $cmd outdated '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
  } else {
    opPrintMaybeRunCmd $cmd outdated
  }
}
