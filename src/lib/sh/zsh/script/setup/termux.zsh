function () {
  local yn=''

  if type termux-reload-settings > /dev/null; then
    if [[ ! -f /etc/os-release ]]; then
      local termux="${HOME}/.termux"

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? setup termux mirrors (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        opPrintMaybeRunCmd termux-change-mirror
      fi

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? setup termux storage (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        opPrintMaybeRunCmd termux-setup-storage
      fi

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? setup termux theme (user) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        local output="${termux}/colors.properties"
        local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
        opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"

        local output="${termux}/Hack.zip"
        local url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
        opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
        opPrintMaybeRunCmd unzip -q "${output}" -d "${output}.unzip"
        opPrintMaybeRunCmd cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${termux}/font.ttf"
        opPrintMaybeRunCmd rm -r -f "${output}"'*'

        opPrintMaybeRunCmd termux-reload-settings
      fi
    fi
  fi
}
