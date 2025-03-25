read yn?'> install bun [user]? (y/N) '
if [[ "${yn}" == 'y' ]]; then
  uri='https://bun.sh/install'
  logOp source '<(' curl --fail --location --show-error --silent --url "${uri}" ')'
  if [[ -z "${NOOP}" ]]; then
    source <( curl --fail --location --show-error --silent --url "${uri}" )
  fi
fi
