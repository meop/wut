function () {
  local yn

  read yn?'? install zoxide (user) [[y]/n] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
    dynOp sh -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
