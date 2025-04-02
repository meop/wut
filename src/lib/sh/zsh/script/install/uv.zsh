function () {
  local yn

  read yn?'? install uv (user) [n/[y]] '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://astral.sh/uv/install.sh'
    dynOp sh -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
