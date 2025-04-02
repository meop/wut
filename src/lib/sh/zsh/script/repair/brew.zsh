function () {
  local yn

  # note: some systems keep changing the owner of these files
  # back to root, so we sometimes need to fix that
  if type brew > /dev/null; then
    read yn?'? repair brew file perms (system) [n/[y]] '
    if [[ "${yn}" == 'y' ]]; then
      local brew_prefix=$(brew --prefix)
      dynOp sudo chown -R $(user) ${brew_prefix}/bin
      dynOp sudo chmod u+w ${brew_prefix}/bin
      dynOp sudo chown -R $(user) ${brew_prefix}/lib
      dynOp sudo chmod u+w ${brew_prefix}/lib
      dynOp sudo chown -R $(user) ${brew_prefix}/sbin
      dynOp sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
}
