function packApt {
  local cmd='apt'

  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      local cmd=$(if type sudo > /dev/null; then "sudo ${cmd}"; else "${cmd}"; fi)
      packAptOp "$cmd"
    fi
  fi
}
