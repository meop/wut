function () {
  local yn

  read yn?'? install bun (user) [y, [n]] '
  if [[ "${yn}" != 'n' ]]; then
    local url='https://bun.sh/install'
    runOpCond bash -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
