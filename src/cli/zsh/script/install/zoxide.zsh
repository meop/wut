function () {
  local yn=''

  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install zoxide (user) [y, [n]] '
  fi
  if [[ $yn != 'n' ]]; then
    local url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
    opPrintMaybeRunCmd sh -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
  fi
}
