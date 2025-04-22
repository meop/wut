function () {
  local yn

  if [[ "${YES}" ]]; then
    yn='y'
  else
    read yn?'? install starship (user) [y, [n]] '
  fi
  if [[ "${yn}" != 'n' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    shRunOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    shRunOpCond sh "${output}" -b "${HOME}/.local/bin"
    shRunOpCond rm -r -f "${output}"'*'
  fi
}
