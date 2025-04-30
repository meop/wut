function packPacman {
  local yn=''
  local cmd='pacman'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    if [[ -z $PACK_MANAGER ]] && type yay > /dev/null; then
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
        opPrintRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd $cmd --sync --needed $PACK_ADD_NAMES
      elif [[ $PACK_OP == 'find' ]]; then
        opPrintRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        opPrintRunCmd $cmd --sync --search $PACK_FIND_NAMES
      elif [[ $PACK_OP == 'list' ]]; then
        if [[ $PACK_LIST_NAMES ]]; then
          opPrintRunCmd $cmd --query '|' grep --ignore-case $PACK_LIST_NAMES
        else
          opPrintRunCmd $cmd --query
        fi
      elif [[ $PACK_OP == 'out' ]]; then
        opPrintRunCmd $cmd --sync --refresh '>' /dev/null '2>&1'
        if [[ $PACK_OUT_NAMES ]]; then
          opPrintRunCmd $cmd --query --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          opPrintRunCmd $cmd --query --upgrades
        fi
      elif [[ $PACK_OP == 'rem' ]]; then
        opPrintRunCmd $cmd --remove --recursive --nosave $PACK_REM_NAMES
        if [[ $PACK_REM_GROUP_NAMES ]]; then
          for group in "${PACK_REM_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintRunCmd "${groupSplit[@]}"
          done
        fi
      elif [[ $PACK_OP == 'sync' ]]; then
        opPrintRunCmd ${cmd} --sync --refresh '>' /dev/null '2>&1'
        if [[ $PACK_SYNC_NAMES ]]; then
          opPrintRunCmd ${cmd} --sync --needed $PACK_SYNC_NAMES
        else
          opPrintRunCmd ${cmd} --sync --sysupgrade
        fi
      elif [[ $PACK_OP == 'tidy' ]]; then
        opPrintRunCmd $cmd --sync --clean
      fi
    fi
  fi
}
