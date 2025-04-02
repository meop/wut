function () {
  local yn

  read yn?'? install starship (user) [[y], n] '
  if [[ "${yn}" == 'y' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    dynOp curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    dynOp sh "${output}" -b "${HOME}/.local/bin"
    dynOp rm -r -f "${output}"'*'
  fi
}
