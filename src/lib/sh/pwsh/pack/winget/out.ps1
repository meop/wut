function packWingetOp ($cmd) {
  if ($PACK_OUT_NAMES) {
    opPrintMaybeRunCmd $cmd upgrade '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
  } else {
    opPrintMaybeRunCmd $cmd upgrade
  }
}
