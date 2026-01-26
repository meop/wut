function packPacmanOp {
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 --query --upgrades
  fi
}
