function packAptOp {
  opPrintMaybeRunCmd $1 update '>' /dev/null '2>&1'
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 install $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 full-upgrade
  fi
}
