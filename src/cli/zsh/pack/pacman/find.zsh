function packPacmanOp {
  opPrintMaybeRunCmd $1 --sync --refresh '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 --sync --search $PACK_FIND_NAMES
}
