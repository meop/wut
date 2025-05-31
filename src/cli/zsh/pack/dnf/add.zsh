function packDnfOp {
  if [[ $PACK_ADD_GROUP_NAMES ]]; then
    for group in "${PACK_ADD_GROUP_NAMES[@]}"; do
      groupSplit=( ${(s: :)group} )
      opPrintMaybeRunCmd "${groupSplit[@]}"
    done
  fi
  opPrintMaybeRunCmd $1 check-update '>' /dev/null '2>&1'
  opPrintMaybeRunCmd $1 install $PACK_ADD_NAMES
}
