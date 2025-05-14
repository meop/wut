function () {
  local yn=''

  # note: some systems keep changing the owner of these files
  # back to root, so we sometimes need to fix that
  if type brew > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? repair brew file perms (system) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      local brew_prefix=$(brew --prefix)
      opPrintMaybeRunCmd sudo chown -R $(user) ${brew_prefix}/bin
      opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix}/bin
      opPrintMaybeRunCmd sudo chown -R $(user) ${brew_prefix}/lib
      opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix}/lib
      opPrintMaybeRunCmd sudo chown -R $(user) ${brew_prefix}/sbin
      opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix}/sbin
    fi
  else
    echo 'brew is not installed'
  fi
}
