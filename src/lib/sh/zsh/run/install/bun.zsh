read yn?'? install bun [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  url='https://bun.sh/install'
  printOp source '<(' curl --fail --location --show-error --silent --url "${url}" ')'
  if [[ -z "${NOOP}" ]]; then
    source <( curl --fail --location --show-error --silent --url "${url}" )
  fi
fi
