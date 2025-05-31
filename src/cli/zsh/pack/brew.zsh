function packBrew {
  local cmd='brew'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      packBrewOp "$cmd"
    fi
  fi
}
