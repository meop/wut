function () {
  # note: some systems keep changing the owner of these files
  # back to root, so we sometimes need to fix that
  if [[ $SYS_OS_PLAT != 'darwin' ]]; then
    echo 'script is for darwin'
    return
  fi
  if ! type brew > /dev/null; then
    echo 'brew is not installed'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? repair brew - fix fs permissions (system) [y, [n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  local brew_prefix_dir_path=$(brew --prefix)
  opPrintMaybeRunCmd sudo chown -R ${USER} ${brew_prefix_dir_path}/bin
  opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix_dir_path}/bin
  opPrintMaybeRunCmd sudo chown -R ${USER} ${brew_prefix_dir_path}/lib
  opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix_dir_path}/lib
  opPrintMaybeRunCmd sudo chown -R ${USER} ${brew_prefix_dir_path}/sbin
  opPrintMaybeRunCmd sudo chmod u+w ${brew_prefix_dir_path}/sbin
}
