function () {
  local yn=''

  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install uv (user) [y, [n]] '
  fi
  if [[ $yn != 'n' ]]; then
    local url='https://astral.sh/uv/install.sh'
    opPrintRunCmd sh -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
  fi
}
