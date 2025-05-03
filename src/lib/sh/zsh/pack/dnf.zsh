function packDnf {
  local yn=''
  local cmd='dnf'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? ${PACK_OP} packages with ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      local cmd=$(if type sudo > /dev/null; then "sudo ${cmd}"; else "${cmd}"; fi)
      if [[ $PACK_OP == 'add' ]]; then
        if [[ $PACK_ADD_GROUP_NAMES ]]; then
          for group in "${PACK_ADD_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintMaybeRunCmd "${groupSplit[@]}"
          done
        fi
        opPrintMaybeRunCmd $cmd check-update '>' /dev/null '2>&1'
        opPrintMaybeRunCmd $cmd install $PACK_ADD_NAMES
      elif [[ $PACK_OP == 'find' ]]; then
        opPrintMaybeRunCmd $cmd check-update '>' /dev/null '2>&1'
        opPrintMaybeRunCmd $cmd search $PACK_FIND_NAMES
      elif [[ $PACK_OP == 'list' ]]; then
        if [[ $PACK_LIST_NAMES ]]; then
          opPrintMaybeRunCmd $cmd list --installed '|' grep --ignore-case $PACK_LIST_NAMES
        else
          opPrintMaybeRunCmd $cmd list --installed
        fi
      elif [[ $PACK_OP == 'out' ]]; then
        opPrintMaybeRunCmd $cmd check-update '>' /dev/null '2>&1'
        if [[ $PACK_OUT_NAMES ]]; then
          opPrintMaybeRunCmd $cmd list --upgrades '|' grep --ignore-case $PACK_OUT_NAMES
        else
          opPrintMaybeRunCmd $cmd list --upgrades
        fi
      elif [[ $PACK_OP == 'rem' ]]; then
        opPrintMaybeRunCmd $cmd remove $PACK_REM_NAMES
        if [[ $PACK_REM_GROUP_NAMES ]]; then
          for group in "${PACK_REM_GROUP_NAMES[@]}"; do
            groupSplit=( ${(s: :)group} )
            opPrintMaybeRunCmd "${groupSplit[@]}"
          done
        fi
      elif [[ $PACK_OP == 'sync' ]]; then
        opPrintMaybeRunCmd $cmd check-update '>' /dev/null '2>&1'
        if [[ $PACK_SYNC_NAMES ]]; then
          opPrintMaybeRunCmd $cmd upgrade $PACK_SYNC_NAMES
        else
          opPrintMaybeRunCmd $cmd distro-sync
        fi
      elif [[ $PACK_OP == 'tidy' ]]; then
        opPrintMaybeRunCmd $cmd clean dbcache
        opPrintMaybeRunCmd $cmd autoremove
      fi
    fi
  fi
}
