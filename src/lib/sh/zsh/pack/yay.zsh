function packYay {
  local yn=''
  local cmd='yay'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? ${PACK_OP} packages with ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      if [[ $PACK_OP == 'add' ]]; then
        if [[ $PACK_ADD_GROUP_NAMES ]]; then
          for group in "${PACK_ADD_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintMaybeRunCmd "${groupSplit[@]}"
          done
        fi
        opPrintMaybeRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        opPrintMaybeRunCmd $cmd --sync --needed $PACK_ADD_NAMES
      elif [[ $PACK_OP == 'find' ]]; then
        opPrintMaybeRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        opPrintMaybeRunCmd $cmd --sync --search $PACK_FIND_NAMES
      elif [[ $PACK_OP == 'list' ]]; then
        if [[ $PACK_LIST_NAMES ]]; then
          opPrintMaybeRunCmd $cmd --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          opPrintMaybeRunCmd $cmd --query
        fi
      elif [[ $PACK_OP == 'out' ]]; then
        opPrintMaybeRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        if [[ $PACK_OUT_NAMES ]]; then
          opPrintMaybeRunCmd $cmd --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          opPrintMaybeRunCmd $cmd --query --upgrades
        fi
      elif [[ $PACK_OP == 'rem' ]]; then
        opPrintMaybeRunCmd $cmd --remove --recursive --nosave $PACK_REM_NAMES
        if [[ $PACK_REM_GROUP_NAMES ]]; then
          for group in "${PACK_REM_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintMaybeRunCmd "${groupSplit[@]}"
          done
        fi
      elif [[ $PACK_OP == 'sync' ]]; then
        opPrintMaybeRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        if [[ $PACK_SYNC_NAMES ]]; then
          opPrintMaybeRunCmd $cmd --sync --needed $PACK_SYNC_NAMES
        else
          opPrintMaybeRunCmd $cmd --sync --sysupgrade
        fi
      elif [[ $PACK_OP == 'tidy' ]]; then
        opPrintMaybeRunCmd $cmd --sync --clean
      fi
    fi
  fi
}
