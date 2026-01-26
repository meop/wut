function packBrewOp {
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 upgrade --greedy $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 upgrade --greedy
  fi
}
