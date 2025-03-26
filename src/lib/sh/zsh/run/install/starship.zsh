read yn?'? install starship [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  _output="${HOME}/install-starship.sh"
  _url='https://starship.rs/install.sh'
  runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
  runOp sh "${_output}" -b "${HOME}/.local/bin"
  runOp rm -r -f "${_output}"'*'
fi
