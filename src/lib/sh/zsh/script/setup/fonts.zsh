function () {
  local yn

  if [[ "${SYS_OS_PLAT}" == 'linux' ]]; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? setup nerd fonts (local) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      local share="${XDG_DATA_HOME:-${HOME}/.local/share}"
      local fonts="${share}/fonts"

      shRunOpCond mkdir -p "${fonts}" '>' /dev/null '2>&1'

      local output="${HOME}/Hack.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      shRunOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
      shRunOpCond unzip -q "${output}" -d "${output}.unzip"
      shRunOpCond cp "${output}.unzip"'/*.ttf' "${fonts}"
      shRunOpCond rm -r -f "${output}"'*'

      local output="${HOME}/FiraCode.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
      shRunOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
      shRunOpCond unzip -q "${output}" -d "${output}.unzip"
      shRunOpCond cp "${output}.unzip"'/*.ttf' "${fonts}"
      shRunOpCond rm -r -f "${output}"'*'
    fi
  fi
}
