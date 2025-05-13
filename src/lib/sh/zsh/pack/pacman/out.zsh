function packPacmanOp {
  opPrintMaybeRunCmd $1 --sync --refresh '>' /dev/null '2>&1'
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 --query --upgrades
  fi
}
