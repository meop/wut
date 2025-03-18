if [[ "$OSTYPE" == 'linux'* ]]; then
  echo -n '> setup nerd fonts [local]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    LOCAL_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}"
    FONTS_DATA="${LOCAL_SHARE}/fonts"

    wutLogOp mkdir -p "${FONTS_DATA}" '> /dev/null 2>&1'
    if [[ -z "${WUT_NO_RUN}" ]]; then
      mkdir -p "${FONTS_DATA}" > /dev/null 2>&1
    fi

    output="${HOME}/Hack.zip"
    uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
    wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
    wutLogOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    wutLogOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    wutLogOp rm -r -f "${output}"'*'
    if [[ -z "${WUT_NO_RUN}" ]]; then
      rm -r -f "${output}"*
    fi

    output="${HOME}/FiraCode.zip"
    uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
    wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
    wutLogOp unzip -q "${output}" -d "${output}.unzip"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      unzip -q "${output}" -d "${output}.unzip"
    fi
    wutLogOp cp "${output}.unzip"'/*.ttf' "${FONTS_DATA}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      cp "${output}.unzip"/*.ttf "${FONTS_DATA}"
    fi
    wutLogOp rm -r -f "${output}"'*'
    if [[ -z "${WUT_NO_RUN}" ]]; then
      rm -r -f "${output}"*
    fi
  fi
fi
