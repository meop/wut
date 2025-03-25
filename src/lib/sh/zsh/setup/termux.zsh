#!/usr/bin/env zsh

if type termux-reload-settings > /dev/null; then
  if [[ ! -f /etc/os-release ]]; then
    TERMUX_HOME="${HOME}/.termux"

    read yn?'> setup termux mirrors? (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      logOp termux-change-mirror
      if [[ -z "${NOOP}" ]]; then
        termux-change-repo
      fi
    fi

    read yn?'> setup termux proots? (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      PROOT_DATA="${PREFIX}/var/lib/proot-distro/installed-rootfs"
      if [[ ! -d "${PROOT_DATA}/archlinux" ]]; then
        logOp proot-distro install archlinux
        if [[ -z "${NOOP}" ]]; then
          proot-distro install archlinux
        fi
      fi
      logOp unlink "${HOME}/proots"
      if [[ -z "${NOOP}" ]]; then
        unlink "${HOME}/proots"
      fi
      logOp ln -s "${PROOT_DATA}" "${HOME}/proots"
      if [[ -z "${NOOP}" ]]; then
        ln -s "${PROOT_DATA}" "${HOME}/proots"
      fi
    fi

    read yn?'> setup termux storage? (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      logOp termux-setup-storage
      if [[ -z "${NOOP}" ]]; then
        termux-setup-storage
      fi
    fi

    read yn?'> setup termux theme [user]? (y/N) '
    if [[ "${yn}" == 'y' ]]; then
      output="${TERMUX_HOME}/colors.properties"
      uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
      logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      if [[ -z "${NOOP}" ]]; then
        curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      fi
      output="${TERMUX_HOME}/Hack.zip"
      uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      if [[ -z "${NOOP}" ]]; then
        curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      fi
      logOp unzip -q "${output}" -d "${output}.unzip"
      if [[ -z "${NOOP}" ]]; then
        unzip -q "${output}" -d "${output}.unzip"
      fi
      logOp cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${TERMUX_HOME}/font.ttf"
      if [[ -z "${NOOP}" ]]; then
        cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${TERMUX_HOME}/font.ttf"
      fi
      logOp rm -r -f "${output}"'*'
      if [[ -z "${NOOP}" ]]; then
        rm -r -f "${output}"*
      fi

      logOp termux-reload-settings
      if [[ -z "${NOOP}" ]]; then
        termux-reload-settings
      fi
    fi
  fi
fi
