function packBrewOp {
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 outdated | grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 outdated
  fi
}
