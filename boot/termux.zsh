if ! type termux-reload-settings > /dev/null; then
  echo 'only supported on termux .. aborting' >&2
  exit 1
fi
if [[ -f '/etc/os-release' ]]; then
  echo 'not supported in termux proot .. aborting' >&2
  exit 1
fi

echo -n '>> wut run straps [setups]? (y/N) '
read yn
if [[ "$yn" == 'y' ]]; then
  zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/termux.zsh"

  zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/fzf.zsh"
  zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/nvim.zsh"
  zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/tmux.zsh"
fi

echo -n '>> wut push dot [files]? (y/N) '
read yn
if [[ "$yn" == 'y' ]]; then
  rm -r -f "${HOME}/.zsh" > /dev/null 2>&1

  mkdir -p "${HOME}/.config" > /dev/null 2>&1
  mkdir -p "${HOME}/.config/nvim" > /dev/null 2>&1
  mkdir -p "${HOME}/.ssh" > /dev/null 2>&1
  mkdir -p "${HOME}/.zsh" > /dev/null 2>&1

  cp "${WUT_CONFIG_LOCATION}/dot/file/git/gitconfig" "${HOME}/.gitconfig"
  cp "${WUT_CONFIG_LOCATION}/dot/file/nvim/init.lua" "${HOME}/.config/nvim/init.lua"
  cp "${WUT_CONFIG_LOCATION}/dot/file/ssh/config" "${HOME}/.ssh/config"
  cp "${WUT_CONFIG_LOCATION}/dot/file/starship/starship.toml" "${HOME}/.config/starship.toml"
  cp "${WUT_CONFIG_LOCATION}/dot/file/tmux/tmux.conf" "${HOME}/.tmux.conf"
  cp "${WUT_CONFIG_LOCATION}/dot/file/zsh/zshrc" "${HOME}/.zshrc"
  cp "${WUT_CONFIG_LOCATION}/dot/file/zsh/zshenv" "${HOME}/.zshenv"
  cp "${WUT_CONFIG_LOCATION}/dot/file/zsh/zsh/"* "${HOME}/.zsh"

  chmod u=rw,g=,o= "${HOME}/.ssh/config" > /dev/null 2>&1
fi
