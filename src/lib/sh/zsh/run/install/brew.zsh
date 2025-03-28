function () {
  local yn

  read yn?'? install brew [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
    runOp bash -c '"$(' curl --fail --location --show-error --silent --url "${url}" ')"'
  fi
}
