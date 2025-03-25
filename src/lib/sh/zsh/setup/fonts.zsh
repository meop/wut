if [[ "$OSTYPE" == 'linux'* ]]; then
  read yn?'> setup nerd fonts [local]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    LOCAL_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}"
    FONTS_DATA="${LOCAL_SHARE}/fonts"

    logOp mkdir -p "${FONTS_DATA}" '>' /dev/null '2>&1'
    if [[ -z "${NOOP}" ]]; then
      mkdir -p "${FONTS_DATA}" > /dev/null 2>&1
    fi

    output="${HOME}/Hack.zip"
    uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
    logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
    logOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${NOOP}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    logOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${NOOP}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    logOp rm -r -f "${output}"'*'
    if [[ -z "${NOOP}" ]]; then
      rm -r -f "${output}"*
    fi

    output="${HOME}/FiraCode.zip"
    uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
    logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
    logOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${NOOP}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    logOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${NOOP}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    logOp rm -r -f "${output}"'*'
    if [[ -z "${NOOP}" ]]; then
      rm -r -f "${output}"*
    fi
  fi
fi
