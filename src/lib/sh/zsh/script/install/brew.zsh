function () {
  local yn=''

  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install brew (user) [y, [n]] '
  fi
  if [[ $yn != 'n' ]]; then
    local url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
    opPrintRunCmd bash -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
  fi
}
