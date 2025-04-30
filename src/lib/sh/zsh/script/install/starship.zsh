function () {
  local yn

  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install starship (user) [y, [n]] '
  fi
  if [[ $yn != 'n' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    opPrintRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
    opPrintRunCmd sh "${output}" -b "${HOME}/.local/bin"
    opPrintRunCmd rm -r -f "${output}"'*'
  fi
}
