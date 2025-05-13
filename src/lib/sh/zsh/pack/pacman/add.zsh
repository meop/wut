function packPacmanOp {
  if [[ $PACK_ADD_GROUP_NAMES ]]; then
    for group in "${PACK_ADD_GROUP_NAMES[@]}"; do
      groupSplit=( ${(s: :)group} )
      opPrintMaybeRunCmd "${groupSplit[@]}"
    done
  fi
  opPrintMaybeRunCmd $1 --sync --refresh '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 --sync --needed $PACK_ADD_NAMES
}
