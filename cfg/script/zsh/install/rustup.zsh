function () {
  if [[ $SYS_OS_PLAT != 'darwin' && $SYS_OS_PLAT != 'linux' ]]; then
    echo 'script is for darwin or linux'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?install rustup (user) [y,[n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  local url='https://sh.rustup.rs'
  mkdir -p "${HOME}/rustup-init"
  (export TMPDIR="${HOME}/rustup-init"; curl --fail-with-body --location --no-progress-meter --url $url | bash)
  rm -rf "${HOME}/rustup-init"
}
