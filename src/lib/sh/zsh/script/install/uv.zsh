function () {
  local yn

  read yn?'? install uv (user) [y, [n]] '
  if [[ "${yn}" != 'n' ]]; then
    local url='https://astral.sh/uv/install.sh'
    runOpCond sh -c '"$(' curl --fail-with-body --location --silent --url "${url}" ')"'
  fi
}
