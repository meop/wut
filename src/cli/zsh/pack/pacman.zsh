function packYay {
  local cmd='yay'
  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      packPacmanOp "$cmd"
    fi
  fi
}
function packPacman {
  local cmd='pacman'
  if [[ -z $PACK_MANAGER ]] && type yay > /dev/null; then
    # yay is a superset of pacman
  elif [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]] "
    fi
    if [[ $yn != 'n' ]]; then
      local cmd=$(if type sudo > /dev/null; then echo "sudo ${cmd}"; else echo "${cmd}"; fi)
      packPacmanOp "$cmd"
    fi
  fi
}
