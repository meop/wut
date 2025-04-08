function () {
  local yn

  read yn?'? install brew (user) [y, [n]] '
  if [[ "${yn}" != 'n' ]]; then
    local url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
    runOpCond bash -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
