function packDnfOp {
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 upgrade $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 distro-sync
  fi
}
