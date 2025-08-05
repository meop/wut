function packApt {
  local cmd='apt'
  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]]: "
    fi
    if [[ $yn != 'n' ]]; then
      local cmd=$(if type sudo > /dev/null; then echo "sudo ${cmd}"; else echo "${cmd}"; fi)
      packAptOp "$cmd"
    fi
  fi
}
