if [[ "$OSTYPE" == 'linux'* ]]; then
  read yn?'? setup nerd fonts [local] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _local_share="${XDG_DATA_HOME:-$HOME/.local/share}"
    _local_fonts="${_local_share}/fonts"

    runOp mkdir -p "${_local_fonts}" '>' /dev/null '2>&1'

    _output="${HOME}/Hack.zip"
    _url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
    runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
    runOp unzip -q "${_output}" -d "${_output}.unzip"
    runOp cp "${_output}.unzip"'/*.ttf' "${_local_fonts}"
    runOp rm -r -f "${_output}"'*'

    _output="${HOME}/FiraCode.zip"
    _url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
    runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
    runOp unzip -q "${_output}" -d "${_output}.unzip"
    runOp cp "${_output}.unzip"'/*.ttf' "${_local_fonts}"
    runOp rm -r -f "${_output}"'*'
  fi
fi
