function () {
  local yn

  read yn?'? install starship [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    runOp curl --location --silent --url "${url}" --create-dirs --output "${output}"
    runOp sh "${output}" -b "${HOME}/.local/bin"
    runOp rm -r -f "${output}"'*'
  fi
}
