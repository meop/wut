read yn?'> install brew [user]? (y/N) '
if [[ "${yn}" == 'y' ]]; then
  uri='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
  printOp source '<(' curl --fail --location --show-error --silent --url "${uri}" ')'
  if [[ -z "${NOOP}" ]]; then
    source <( curl --fail --location --show-error --silent --url "${uri}" )
  fi
fi
