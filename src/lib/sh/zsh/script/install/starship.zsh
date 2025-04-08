function () {
  local yn

  read yn?'? install starship (user) [y, [n]] '
  if [[ "${yn}" != 'n' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    runOpCond sh "${output}" -b "${HOME}/.local/bin"
    runOpCond rm -r -f "${output}"'*'
  fi
}
