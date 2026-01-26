function packBrew {
  local cmd='brew'
  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]]: "
    fi
    if [[ $yn != 'n' ]]; then
      if [[ -n $PACK_OP && ( "$PACK_OP" == 'add' || "$PACK_OP" == 'find' || "$PACK_OP" == 'out' || "$PACK_OP" == 'sync' ) ]]; then
        opPrintMaybeRunCmd $cmd update '>' /dev/null '2>&1'
      fi
      packBrewOp "$cmd"
    fi
  fi
}
