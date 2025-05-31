function packDnfOp {
  opPrintMaybeRunCmd $1 check-update '>' /dev/null '2>&1'
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 upgrade $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 distro-sync
  fi
}
