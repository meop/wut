read yn?'? install starship [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  output="${HOME}/install-starship.sh"
  url='https://starship.rs/install.sh'
  printOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
  if [[ -z "${NOOP}" ]]; then
    curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
  fi
  printOp sh "${output}" -b "${HOME}/.local/bin"
  if [[ -z "${NOOP}" ]]; then
    sh "${output}" -b "${HOME}/.local/bin"
  fi
  printOp rm -r -f "${output}"'*'
  if [[ -z "${NOOP}" ]]; then
    rm -r -f "${output}"*
  fi
fi
