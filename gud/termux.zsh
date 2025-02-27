#!/usr/bin/env zsh

if ! type termux-reload-settings > /dev/null; then
  echo 'only supported on termux .. aborting' >&2
  exit 1
fi
if [[ -f /etc/os-release ]]; then
  echo 'not supported in termux proot .. aborting' >&2
  exit 1
fi

(
  if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
    export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
  fi

  TERMUX_HOME="${HOME}/.termux"

  echo -n '> setup mirrors? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    termux-change-repo
  fi

  echo -n '> setup packages? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    apt update
    apt full-upgrade
    apt install \
      curl \
      fd \
      fzf \
      git \
      neovim \
      proot \
      proot-distro \
      starship \
      tmux \
      unzip \
      which \
      zoxide \
      zsh
    apt autoclean
    apt autoremove
    chsh -s zsh
  fi

  echo -n '> push (dot)files [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    rm -r -f "${HOME}/.zsh" > /dev/null 2>&1

    mkdir -p "${HOME}/.config" > /dev/null 2>&1
    mkdir -p "${HOME}/.config/nvim" > /dev/null 2>&1
    mkdir -p "${HOME}/.ssh" > /dev/null 2>&1
    mkdir -p "${HOME}/.zsh" > /dev/null 2>&1

    cp "${WUT_CONFIG_LOCATION}/file/git/gitconfig" "${HOME}/.gitconfig"
    cp "${WUT_CONFIG_LOCATION}/file/nvim/init.lua" "${HOME}/.config/nvim/init.lua"
    cp "${WUT_CONFIG_LOCATION}/file/ssh/config" "${HOME}/.ssh/config"
    cp "${WUT_CONFIG_LOCATION}/file/starship/starship.toml" "${HOME}/.config/starship.toml"
    cp "${WUT_CONFIG_LOCATION}/file/tmux/tmux.conf" "${HOME}/.tmux.conf"
    cp "${WUT_CONFIG_LOCATION}/file/zsh/zshrc" "${HOME}/.zshrc"
    cp "${WUT_CONFIG_LOCATION}/file/zsh/zshenv" "${HOME}/.zshenv"
    cp "${WUT_CONFIG_LOCATION}/file/zsh/zsh/"* "${HOME}/.zsh"

    chmod u=rw,g=,o= "${HOME}/.ssh/config" > /dev/null 2>&1
  fi

  echo -n '> setup proots? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    PROOT_DATA="${PREFIX}/var/lib/proot-distro/installed-rootfs"
    if [[ ! -d "${PROOT_DATA}/archlinux" ]]; then
      proot-distro install archlinux
    fi
    unlink "${HOME}/proots"
    ln -s "${PROOT_DATA}" "${HOME}/proots"
  fi

  echo -n '> setup storage? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    termux-setup-storage
  fi

  echo -n '> setup theme [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    output="${TERMUX_HOME}/colors.properties"
    curl --fail --location --show-error --silent \
      --url 'https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/termux/tokyonight_moon.properties' \
      --create-dirs \
      --output "${output}"

    output="${TERMUX_HOME}/Hack.zip"
    curl --fail --location --show-error --silent \
      --url 'https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/Hack.zip' \
      --create-dirs \
      --output "${output}"
    unzip -q "${output}" -d "${output}.unzip"
    cp "${output}.unzip/HackNerdFontMono-Regular.ttf" "${TERMUX_HOME}/font.ttf"
    rm -r -f "${output}"*

    termux-reload-settings
  fi
)
