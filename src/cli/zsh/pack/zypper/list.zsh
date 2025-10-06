function packZypperOp {
  if [[ $PACK_LIST_NAMES ]]; then
    opPrintMaybeRunCmd $1 search --installed-only '2>' /dev/null '|' grep --ignore-case $PACK_LIST_NAMES
  else
    opPrintMaybeRunCmd $1 search --installed-only
  fi
}
