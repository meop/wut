function () {
  local yn

  read yn?'? install bun (user) [n/[y]] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://bun.sh/install'
    dynOp bash -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
