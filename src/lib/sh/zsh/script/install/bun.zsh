function () {
  local yn

  read yn?'? install bun (user) [[y], n] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://bun.sh/install'
    dynOp bash -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
