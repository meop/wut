function packAptget {
  local yn=''
  local cmd='apt-get'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    if [[ -z $PACK_MANAGER ]] && type apt > /dev/null; then
      yn='n'
    elif [[ $YES ]]; then
      yn='y'
    else
      read "yn?? ${PACK_OP} packages with ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      if type sudo > /dev/null; then
        cmd="sudo ${cmd}"
      fi
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
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        local cacheCmd='apt-cache'
        if type sudo > /dev/null; then
          cacheCmd="sudo ${cacheCmd}"
        fi
        opPrintRunCmd $"{cacheCmd}" search $PACK_FIND_NAMES
      elif [[ $PACK_OP == 'list' ]]; then
        if [[ $PACK_LIST_NAMES ]]; then
          opPrintRunCmd $cmd list --installed '2>' /dev/null '|' grep --ignore-case $PACK_LIST_NAMES
        else
          opPrintRunCmd $cmd list --installed
        fi
      elif [[ $PACK_OP == 'out' ]]; then
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        if [[ $PACK_OUT_NAMES ]]; then
          opPrintRunCmd $cmd list --upgradable '2>' /dev/null '|' grep --ignore-case $PACK_OUT_NAMES
        else
          opPrintRunCmd $cmd list --upgradable
        fi
      elif [[ $PACK_OP == 'rem' ]]; then
        opPrintRunCmd $cmd purge $PACK_REM_NAMES
        if [[ $PACK_REM_GROUP_NAMES ]]; then
          for group in "${PACK_REM_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintRunCmd "${groupSplit[@]}"
          done
        fi
      elif [[ $PACK_OP == 'sync' ]]; then
        opPrintRunCmd $cmd update '>' /dev/null '2>&1'
        if [[ $PACK_SYNC_NAMES ]]; then
          opPrintRunCmd $cmd install $PACK_SYNC_NAMES
        else
          opPrintRunCmd $cmd dist-upgrade
        fi
      elif [[ $PACK_OP == 'tidy' ]]; then
        opPrintRunCmd $cmd autoclean
        opPrintRunCmd $cmd autoremove
      fi
    fi
  fi
}
