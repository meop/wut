echo -n '> install brew [user]? (y/N) '
read yn
if [[ "${yn}" == 'y' ]]; then
  uri='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
  wutLogOp curl --fail --location --show-error --silent --url "${uri}" '| bash'
  if [[ -z "${WUT_NOOP}" ]]; then
    curl --fail --location --show-error --silent --url "${uri}" | bash
  fi
fi
