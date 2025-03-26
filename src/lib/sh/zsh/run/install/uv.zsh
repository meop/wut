read yn?'> install uv [user]? (y/N) '
if [[ "${yn}" == 'y' ]]; then
  uri='https://astral.sh/uv/install.sh'
  printOp source '<(' curl --fail --location --show-error --silent --url "${uri}" ')'
  if [[ -z "${NOOP}" ]]; then
    source <( curl --fail --location --show-error --silent --url "${uri}" )
  fi
fi
