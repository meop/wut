#!/usr/bin/env zsh

if type termux-reload-settings > /dev/null; then
  if [[ ! -f /etc/os-release ]]; then
    TERMUX_HOME="${HOME}/.termux"

    echo -n '> setup termux mirrors? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      wutLogOp termux-change-mirror
      if [[ -z "${WUT_NO_RUN}" ]]; then
        termux-change-repo
      fi
    fi

    echo -n '> setup termux proots? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      PROOT_DATA="${PREFIX}/var/lib/proot-distro/installed-rootfs"
      if [[ ! -d "${PROOT_DATA}/archlinux" ]]; then
        wutLogOp proot-distro install archlinux
        if [[ -z "${WUT_NO_RUN}" ]]; then
          proot-distro install archlinux
        fi
      fi
      wutLogOp unlink "${HOME}/proots"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        unlink "${HOME}/proots"
      fi
      wutLogOp ln -s "${PROOT_DATA}" "${HOME}/proots"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        ln -s "${PROOT_DATA}" "${HOME}/proots"
      fi
    fi

    echo -n '> setup termux storage? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      wutLogOp termux-setup-storage
      if [[ -z "${WUT_NO_RUN}" ]]; then
        termux-setup-storage
      fi
    fi

    echo -n '> setup termux theme [user]? (y/N) '
    read yn
    if [[ "${yn}" == 'y' ]]; then
      output="${TERMUX_HOME}/colors.properties"
      uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties'
      wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      fi
      output="${TERMUX_HOME}/Hack.zip"
      uri='https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip'
      wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
      fi
      wutLogOp unzip -q "${output}" -d "${output}.unzip"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        unzip -q "${output}" -d "${output}.unzip"
      fi
      wutLogOp cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${TERMUX_HOME}/font.ttf"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${TERMUX_HOME}/font.ttf"
      fi
      wutLogOp rm -r -f "${output}"'*'
      if [[ -z "${WUT_NO_RUN}" ]]; then
        rm -r -f "${output}"*
      fi

      wutLogOp termux-reload-settings
      if [[ -z "${WUT_NO_RUN}" ]]; then
        termux-reload-settings
      fi
    fi
  fi
fi
