function () {
  local yn

  if [[ "${sys_os_plat}" == 'linux' ]]; then
    read yn?'? setup nerd fonts (local) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local share="${XDG_DATA_HOME:-${HOME}/.local/share}"
      local fonts="${share}/fonts"

      runOpCond mkdir -p "${fonts}" '>' /dev/null '2>&1'

      local output="${HOME}/Hack.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
      runOpCond unzip -q "${output}" -d "${output}.unzip"
      runOpCond cp "${output}.unzip"'/*.ttf' "${fonts}"
      runOpCond rm -r -f "${output}"'*'

      local output="${HOME}/FiraCode.zip"
      local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/FiraCode.zip'
      runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
      runOpCond unzip -q "${output}" -d "${output}.unzip"
      runOpCond cp "${output}.unzip"'/*.ttf' "${fonts}"
      runOpCond rm -r -f "${output}"'*'
    fi
  fi
}
