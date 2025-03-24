echo -n '> install bun [user]? (y/N) '
read yn
if [[ "${yn}" == 'y' ]]; then
  uri='https://bun.sh/install'
  wutLogOp curl --fail --location --show-error --silent --url "${uri}" '| bash'
  if [[ -z "${WUT_NOOP}" ]]; then
    curl --fail --location --show-error --silent --url "${uri}" | bash
  fi
fi
