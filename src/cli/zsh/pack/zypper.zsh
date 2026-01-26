function packZypper {
  local cmd='zypper'
  if [[ -z $PACK_MANAGER || $PACK_MANAGER == $cmd ]] && type $cmd > /dev/null; then
    local yn=''
    if [[ $YES ]]; then
      yn='y'
    else
      read "yn?? use ${cmd} (system) [y, [n]]: "
    fi
    if [[ $yn != 'n' ]]; then
      local cmd=$(if type sudo > /dev/null; then echo "sudo ${cmd}"; else echo "${cmd}"; fi)
      if [[ -n $PACK_OP && ( "$PACK_OP" == 'add' || "$PACK_OP" == 'find' || "$PACK_OP" == 'out' || "$PACK_OP" == 'sync' ) ]]; then
        opPrintMaybeRunCmd $cmd refresh '>' /dev/null '2>&1'
      fi
      packZypperOp "$cmd"
    fi
  fi
}
