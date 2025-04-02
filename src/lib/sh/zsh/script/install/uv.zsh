function () {
  local yn

  read yn?'? install uv (user) [[y], n] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://astral.sh/uv/install.sh'
    dynOp sh -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
