function packAptOp {
  if [[ $PACK_LIST_NAMES ]]; then
    opPrintMaybeRunCmd $1 list --installed '2>' /dev/null '|' grep --ignore-case $PACK_LIST_NAMES
  else
    opPrintMaybeRunCmd $1 list --installed
  fi
}
