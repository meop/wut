read yn?'? install bun [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  _url='https://bun.sh/install'
  runOp curl --fail --location --show-error --silent --url "${_url}" '|' bash
fi
