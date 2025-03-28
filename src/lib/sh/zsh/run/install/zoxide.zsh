function () {
  local yn

  read yn?'? install zoxide (user) [y/N] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
    runOp sh -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
