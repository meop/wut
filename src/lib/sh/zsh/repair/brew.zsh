# note: some systems keep changing the owner of these files
# back to root, so we sometimes need to fix that
if type brew > /dev/null; then
  read yn?'> repair brew file perms [system]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    brew_prefix=$(brew --prefix)
    logOp sudo chown -R ${USER} ${brew_prefix}/bin
    if [[ -z "${NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/bin
    fi
    logOp sudo chmod u+w ${brew_prefix}/bin
    if [[ -z "${NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/bin
    fi
    logOp sudo chown -R ${USER} ${brew_prefix}/lib
    if [[ -z "${NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/lib
    fi
    logOp sudo chmod u+w ${brew_prefix}/lib
    if [[ -z "${NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/lib
    fi
    logOp sudo chown -R ${USER} ${brew_prefix}/sbin
    if [[ -z "${NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/sbin
    fi
    logOp sudo chmod u+w ${brew_prefix}/sbin
    if [[ -z "${NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
fi
