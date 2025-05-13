function packScoopOp ($cmd) {
  opPrintMaybeRunCmd $cmd update '>' '$null' '2>&1' '3>&1' '4>&1' '5>&1' '6>&1'
  if ($PACK_OUT_NAMES) {
    opPrintMaybeRunCmd $cmd status '2>&1' '3>&1' '4>&1' '5>&1' '6>&1' '|' Select-String $PACK_OUT_NAMES '|' Select-Object -ExpandProperty Line
  } else {
    opPrintMaybeRunCmd $cmd status
  }
}
