function () {
  local yn

  if type termux-reload-settings > /dev/null; then
    if [[ ! -f /etc/os-release ]]; then
      local termux="${HOME}/.termux"

      read yn?'? setup termux mirrors (system) [y, [n]] '
      if [[ "${yn}" != 'n' ]]; then
        runOpCond termux-change-mirror
      fi

      read yn?'? setup termux storage (system) [y, [n]] '
      if [[ "${yn}" != 'n' ]]; then
        runOpCond termux-setup-storage
      fi

      read yn?'? setup termux theme (user) [y, [n]] '
      if [[ "${yn}" != 'n' ]]; then
        local output="${termux}/colors.properties"
        local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
        runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"

        local output="${termux}/Hack.zip"
        local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
        runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
        runOpCond unzip -q "${output}" -d "${output}.unzip"
        runOpCond cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${termux}/font.ttf"
        runOpCond rm -r -f "${output}"'*'

        runOpCond termux-reload-settings
      fi
    fi
  fi
}
