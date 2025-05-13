function packBrewOp {
  if [[ $PACK_LIST_NAMES ]]; then
    opPrintMaybeRunCmd $1 list '|' grep --ignore-case $PACK_LIST_NAMES
  else
    opPrintMaybeRunCmd $1 list
  fi
}
