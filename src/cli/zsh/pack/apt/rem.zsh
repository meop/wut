function packAptOp {
  opPrintMaybeRunCmd $1 purge $PACK_REM_NAMES
  if [[ $PACK_REM_GROUP_NAMES ]]; then
    for group in "${PACK_REM_GROUP_NAMES[@]}"; do
      groupSplit=( ${(s: :)group} )
      opPrintMaybeRunCmd "${groupSplit[@]}"
    done
  fi
}
