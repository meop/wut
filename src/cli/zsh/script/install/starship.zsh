function () {
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install starship (user) [y, [n]] '
  fi
  if [[ $yn != 'n' ]]; then
    local output="${HOME}/install-starship.sh"
    local url='https://starship.rs/install.sh'
    opPrintMaybeRunCmd mkdir -p "${HOME}/.local/bin" '>' /dev/null '2>&1'
    opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
    opPrintMaybeRunCmd sh "${output}" -b "${HOME}/.local/bin"
    opPrintMaybeRunCmd rm -r -f "${output}"'*'
  fi
}
