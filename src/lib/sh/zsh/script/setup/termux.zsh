function () {
  local yn

  if type termux-reload-settings > /dev/null; then
    if [[ ! -f /etc/os-release ]]; then
      local termux="${HOME}/.termux"

      read yn?'? setup termux mirrors (system) [n/[y]] '
      if [[ "${yn}" == 'y' ]]; then
        dynOp termux-change-mirror
      fi

      read yn?'? setup termux storage (system) [n/[y]] '
      if [[ "${yn}" == 'y' ]]; then
        dynOp termux-setup-storage
      fi

      read yn?'? setup termux theme (user) [n/[y]] '
      if [[ "${yn}" == 'y' ]]; then
        local output="${termux}/colors.properties"
        local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
        dynOp curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"

        local output="${termux}/Hack.zip"
        local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
        dynOp curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
        dynOp unzip -q "${output}" -d "${output}.unzip"
        dynOp cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${termux}/font.ttf"
        dynOp rm -r -f "${output}"'*'

        dynOp termux-reload-settings
      fi
    fi
  fi
}
