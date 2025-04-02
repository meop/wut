function () {
  local yn

  read yn?'? install brew (user) [[y], n] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
    dynOp bash -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
