echo -n '> install starship [user]? (y/N) '
read yn
if [[ "${yn}" == 'y' ]]; then
  output="${HOME}/install-starship.sh"
  uri='https://starship.rs/install.sh'
  wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
  if [[ -z "${WUT_NO_RUN}" ]]; then
    curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
  fi
  wutLogOp sh "${output}" -b "${HOME}/.local/bin"
  if [[ -z "${WUT_NO_RUN}" ]]; then
    sh "${output}" -b "${HOME}/.local/bin"
  fi
  wutLogOp rm -r -f "${output}"'*'
  if [[ -z "${WUT_NO_RUN}" ]]; then
    rm -r -f "${output}"*
  fi
fi
