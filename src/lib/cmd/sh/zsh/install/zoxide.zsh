echo -n '> install zoxide [user]? (y/N) '
read yn
if [[ "${yn}" == 'y' ]]; then
  uri='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
  wutLogOp curl --fail --location --show-error --silent --url "${uri}" '| sh'
  if [[ -z "${WUT_NO_RUN}" ]]; then
    curl --fail --location --show-error --silent --url "${uri}" | sh
  fi
fi
