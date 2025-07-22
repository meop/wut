function packDnfOp {
  opPrintMaybeRunCmd $1 check-upgrade '>' /dev/null '2>&1'
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 list --upgrades
  fi
}
