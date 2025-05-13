function packBrewOp {
  opPrintMaybeRunCmd $1 update '>' /dev/null '2>&1'
  if [[ $PACK_OUT_NAMES ]]; then
    opPrintMaybeRunCmd $1 outdated | grep --ignore-case $PACK_OUT_NAMES
  else
    opPrintMaybeRunCmd $1 outdated
  fi
}
