function () {
  local yn

  read yn?'? install zoxide (user) [y, [n]] '
  if [[ "${yn}" != 'n' ]]; then
    local url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
    runOpCond sh -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
