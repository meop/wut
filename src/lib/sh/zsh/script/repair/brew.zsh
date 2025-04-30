function () {
  local yn

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
      opPrintRunCmd sudo chown -R $(user) ${brew_prefix}/bin
      opPrintRunCmd sudo chmod u+w ${brew_prefix}/bin
      opPrintRunCmd sudo chown -R $(user) ${brew_prefix}/lib
      opPrintRunCmd sudo chmod u+w ${brew_prefix}/lib
      opPrintRunCmd sudo chown -R $(user) ${brew_prefix}/sbin
      opPrintRunCmd sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
}
