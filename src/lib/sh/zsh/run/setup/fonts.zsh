if [[ "$OSTYPE" == 'linux'* ]]; then
  read yn?'? setup nerd fonts [local] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    LOCAL_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}"
    FONTS_DATA="${LOCAL_SHARE}/fonts"

    printOp mkdir -p "${FONTS_DATA}" '>' /dev/null '2>&1'
    if [[ -z "${NOOP}" ]]; then
      mkdir -p "${FONTS_DATA}" > /dev/null 2>&1
    fi

    output="${HOME}/Hack.zip"
    url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
    printOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    fi
    printOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${NOOP}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    printOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${NOOP}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    printOp rm -r -f "${output}"'*'
    if [[ -z "${NOOP}" ]]; then
      rm -r -f "${output}"*
    fi

    output="${HOME}/FiraCode.zip"
    url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
    printOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    fi
    printOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${NOOP}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    printOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${NOOP}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    printOp rm -r -f "${output}"'*'
    if [[ -z "${NOOP}" ]]; then
      rm -r -f "${output}"*
    fi
  fi
fi
