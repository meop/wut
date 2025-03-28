function () {
  local yn

  # note: some systems keep changing the owner of these files
  # back to root, so we sometimes need to fix that
  if type brew > /dev/null; then
    read yn?'? repair brew file perms [system] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      local brew_prefix=$(brew --prefix)
      runOp sudo chown -R ${USER} ${brew_prefix}/bin
      runOp sudo chmod u+w ${brew_prefix}/bin
      runOp sudo chown -R ${USER} ${brew_prefix}/lib
      runOp sudo chmod u+w ${brew_prefix}/lib
      runOp sudo chown -R ${USER} ${brew_prefix}/sbin
      runOp sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
}
