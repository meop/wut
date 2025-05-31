function packPacmanOp {
  if [[ $PACK_LIST_NAMES ]]; then
    opPrintMaybeRunCmd $1 --query '|' grep --ignore-case $PACK_LIST_NAMES
  else
    opPrintMaybeRunCmd $1 --query
  fi
}
