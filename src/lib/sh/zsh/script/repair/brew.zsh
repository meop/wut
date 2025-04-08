function () {
  local yn

  # note: some systems keep changing the owner of these files
  # back to root, so we sometimes need to fix that
  if type brew > /dev/null; then
    read yn?'? repair brew file perms (system) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local brew_prefix=$(brew --prefix)
      runOpCond sudo chown -R $(user) ${brew_prefix}/bin
      runOpCond sudo chmod u+w ${brew_prefix}/bin
      runOpCond sudo chown -R $(user) ${brew_prefix}/lib
      runOpCond sudo chmod u+w ${brew_prefix}/lib
      runOpCond sudo chown -R $(user) ${brew_prefix}/sbin
      runOpCond sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
}
