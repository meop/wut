function () {
  local yn

  if [[ "$OSTYPE" == 'linux'* ]]; then
    read yn?'? setup nerd fonts [local] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      local share="${XDG_DATA_HOME:-$HOME/.local/share}"
      local fonts="${share}/fonts"

      runOp mkdir -p "${fonts}" '>' /dev/null '2>&1'

      local output="${HOME}/Hack.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      runOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
      runOp unzip -q "${output}" -d "${output}.unzip"
      runOp cp "${output}.unzip"'/*.ttf' "${fonts}"
      runOp rm -r -f "${output}"'*'

      local output="${HOME}/FiraCode.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
      runOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
      runOp unzip -q "${output}" -d "${output}.unzip"
      runOp cp "${output}.unzip"'/*.ttf' "${fonts}"
      runOp rm -r -f "${output}"'*'
    fi
  fi
}
