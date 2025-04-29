function () {
  local yn

  if [[ "${YES}" ]]; then
    yn='y'
  else
    read 'yn?? install bun (user) [y, [n]] '
  fi
  if [[ "${yn}" != 'n' ]]; then
    local url='https://bun.sh/install'
    shRunOpCond bash -c '"$(' curl --fail-with-body --location --no-progress-meter --url "${url}" ')"'
  fi
}
