read yn?'? install uv [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  _url='https://astral.sh/uv/install.sh'
  runOp curl --fail --location --show-error --silent --url "${_url}" '|' sh
fi
