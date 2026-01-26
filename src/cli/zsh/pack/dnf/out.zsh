function packDnfOp {
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 list --upgrades
  fi
}
