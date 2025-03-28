function () {
  local yn

  read yn?'? install bun [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    local url='https://bun.sh/install'
    runOp bash -c '"$(' curl --location --silent --url "${url}" ')"'
  fi
}
