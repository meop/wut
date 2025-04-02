function () {
  local yn

  read yn?'? install brew (user) [n/[y]] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
    dynOp bash -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
