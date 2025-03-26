read yn?'? install uv [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  url='https://astral.sh/uv/install.sh'
  printOp source '<(' curl --fail --location --show-error --silent --url "${url}" ')'
  if [[ -z "${NOOP}" ]]; then
    source <( curl --fail --location --show-error --silent --url "${url}" )
  fi
fi
