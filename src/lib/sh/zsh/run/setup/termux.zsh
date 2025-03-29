function () {
  local yn

  if type termux-reload-settings > /dev/null; then
    if [[ ! -f /etc/os-release ]]; then
      local termux="${HOME}/.termux"

      read yn?'? setup termux mirrors (system) [[y]/n] '
      if [[ "${yn}" == 'y' ]]; then
        runOp termux-change-mirror
      fi

      read yn?'? setup termux storage (system) [[y]/n] '
      if [[ "${yn}" == 'y' ]]; then
        runOp termux-setup-storage
      fi

      read yn?'? setup termux theme (user) [[y]/n] '
      if [[ "${yn}" == 'y' ]]; then
        local output="${termux}/colors.properties"
        local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
        runOp curl --location --silent --url "${url}" --create-dirs --output "${output}"

        local output="${termux}/Hack.zip"
        local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
        runOp curl --location --silent --url "${url}" --create-dirs --output "${output}"
        runOp unzip -q "${output}" -d "${output}.unzip"
        runOp cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${termux}/font.ttf"
        runOp rm -r -f "${output}"'*'

        runOp termux-reload-settings
      fi
    fi
  fi
}
