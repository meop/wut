if type termux-reload-settings > /dev/null; then
  if [[ ! -f /etc/os-release ]]; then
    _termux_home="${HOME}/.termux"

    read yn?'? setup termux mirrors (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      runOp termux-change-mirror
    fi

    read yn?'? setup termux proots (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      _proot="${PREFIX}/var/lib/proot-distro/installed-rootfs"
      if [[ ! -d "${_proot}/archlinux" ]]; then
        runOp proot-distro install archlinux
      fi
      runOp unlink "${HOME}/proots"
      runOp ln -s "${_proot}" "${HOME}/proots"
    fi

    read yn?'? setup termux storage (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      runOp termux-setup-storage
    fi

    read yn?'? setup termux theme [user] (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      _output="${_termux_home}/colors.properties"
      _url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
      runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"

      _output="${_termux_home}/Hack.zip"
      _url='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
      runOp unzip -q "${_output}" -d "${_output}.unzip"
      runOp cp "${_output}.unzip/HackNerdFontMono-Regular.ttf" "${_termux_home}/font.ttf"
      runOp rm -r -f "${_output}"'*'

      runOp termux-reload-settings
    fi
  fi
fi
