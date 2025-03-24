# note: some systems keep changing the owner of these files
# back to root, so we sometimes need to fix that
if type brew > /dev/null; then
  echo -n '> repair brew file perms [system]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    brew_prefix=$(brew --prefix)
    wutLogOp sudo chown -R ${USER} ${brew_prefix}/bin
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/bin
    fi
    wutLogOp sudo chmod u+w ${brew_prefix}/bin
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/bin
    fi
    wutLogOp sudo chown -R ${USER} ${brew_prefix}/lib
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/lib
    fi
    wutLogOp sudo chmod u+w ${brew_prefix}/lib
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/lib
    fi
    wutLogOp sudo chown -R ${USER} ${brew_prefix}/sbin
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chown -R ${USER} ${brew_prefix}/sbin
    fi
    wutLogOp sudo chmod u+w ${brew_prefix}/sbin
    if [[ -z "${WUT_NOOP}" ]]; then
      sudo chmod u+w ${brew_prefix}/sbin
    fi
  fi
fi
