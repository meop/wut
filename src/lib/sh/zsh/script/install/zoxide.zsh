function () {
  local yn

  read yn?'? install zoxide (user) [n/[y]] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
    dynOp sh -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
