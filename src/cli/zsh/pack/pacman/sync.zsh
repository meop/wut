function packPacmanOp {
  if [[ $PACK_SYNC_NAMES ]]; then
    opPrintMaybeRunCmd $1 --sync --needed $PACK_SYNC_NAMES
  else
    opPrintMaybeRunCmd $1 --sync --sysupgrade
  fi
}
