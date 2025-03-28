function () {
  local yn

  read yn?'? install uv [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://astral.sh/uv/install.sh'
    runOp sh -c '"$(' curl --fail --location --show-error --silent --url "${url}" ')"'
  fi
}
