function packPacmanOp {
  opPrintMaybeRunCmd $1 --sync --refresh '>' /dev/null '2>&1'
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 --sync --needed $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 --sync --sysupgrade
  fi
}
