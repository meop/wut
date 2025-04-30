function packBrew {
  local yn=''
  local cmd='brew'

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
            opPrintRunCmd "${groupSplit[@]}"
          done
        fi
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        opPrintRunCmd $cmd install $PACK_ADD_NAMES
      elif [[ $PACK_OP == 'find' ]]; then
        opPrintRunCmd $cmd search $PACK_FIND_NAMES
      elif [[ $PACK_OP == 'list' ]]; then
        if [[ $PACK_LIST_NAMES ]]; then
          opPrintRunCmd $cmd list '|' grep --ignore-case $PACK_LIST_NAMES
        else
          opPrintRunCmd $cmd list
        fi
      elif [[ $PACK_OP == 'out' ]]; then
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        if [[ $PACK_OUT_NAMES ]]; then
          opPrintRunCmd $cmd outdated | grep --ignore-case $PACK_OUT_NAMES
        else
          opPrintRunCmd $cmd outdated
        fi
      elif [[ $PACK_OP == 'rem' ]]; then
        opPrintRunCmd $cmd uninstall $PACK_REM_NAMES
        if [[ $PACK_REM_GROUP_NAMES ]]; then
          for group in "${PACK_REM_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintRunCmd "${groupSplit[@]}"
          done
        fi
      elif [[ $PACK_OP == 'sync' ]]; then
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        if [[ $PACK_SYNC_NAMES ]]; then
          opPrintRunCmd $cmd upgrade --greedy $PACK_SYNC_NAMES
        else
          opPrintRunCmd $cmd upgrade --greedy
        fi
      elif [[ $PACK_OP == 'tidy' ]]; then
        opPrintRunCmd $cmd cleanup --prune=all
      fi
    fi
  fi
}
