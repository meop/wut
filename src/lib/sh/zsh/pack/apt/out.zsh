function packAptOp {
  opPrintMaybeRunCmd $1 update '>' /dev/null '2>&1'
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 list --upgradable
  fi
}
