read yn?'> install starship [user]? (y/N) '
if [[ "${yn}" == 'y' ]]; then
  output="${HOME}/install-starship.sh"
  uri='https://starship.rs/install.sh'
  logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
  if [[ -z "${NOOP}" ]]; then
    curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
  fi
  logOp sh "${output}" -b "${HOME}/.local/bin"
  if [[ -z "${NOOP}" ]]; then
    sh "${output}" -b "${HOME}/.local/bin"
  fi
  logOp rm -r -f "${output}"'*'
  if [[ -z "${NOOP}" ]]; then
    rm -r -f "${output}"*
  fi
fi
