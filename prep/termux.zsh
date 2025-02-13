if ! type termux-reload-settings > /dev/null; then
  echo 'only supported on termux .. aborting' >&2
  exit 1
fi

if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
  WUT_CONFIG_LOCATION="${HOME}/.wut-config"
fi

if [[ -d "${WUT_CONFIG_LOCATION}" ]]; then
  echo "> git -C '${WUT_CONFIG_LOCATION}' pull --prune"
  git -C "${WUT_CONFIG_LOCATION}" pull --prune
  echo
else
  echo "> git clone --quiet --depth 1 'git@github.com:meop/wut-config.git' '${WUT_CONFIG_LOCATION}'"
  git clone --quiet \
    --depth 1 \
    'git@github.com:meop/wut-config.git' \
    "${WUT_CONFIG_LOCATION}"
  echo
fi

zsh "${WUT_CONFIG_LOCATION}/bin/zsh/setup/termux.zsh"

zsh "${WUT_CONFIG_LOCATION}/bin/zsh/setup/fzf.zsh"
zsh "${WUT_CONFIG_LOCATION}/bin/zsh/setup/nvim.zsh"
zsh "${WUT_CONFIG_LOCATION}/bin/zsh/setup/tmux.zsh"

mkdir -p "${HOME}/.config" > /dev/null 2>&1
cp "${WUT_CONFIG_LOCATION}/dot/starship/starship.toml" "${HOME}/.config/starship.toml"

mkdir -p "${HOME}/.zsh" > /dev/null 2>&1
cp "${WUT_CONFIG_LOCATION}/dot/zsh/*" "${HOME}/.zsh/"
cp "${WUT_CONFIG_LOCATION}/dot/zsh/zshenv" "${HOME}/.zshenv"
cp "${WUT_CONFIG_LOCATION}/dot/zsh/zshrc" "${HOME}/.zshrc"
