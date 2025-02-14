if ! type termux-reload-settings > /dev/null; then
  echo 'only supported on termux .. aborting' >&2
  exit 1
fi
if [[ -f '/etc/os-release' ]]; then
  echo 'not supported in termux proot .. aborting' >&2
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

rm -r -f "${HOME}/.zsh" > /dev/null 2>&1

mkdir -p "${HOME}/.config" > /dev/null 2>&1
mkdir -p "${HOME}/.ssh" > /dev/null 2>&1
mkdir -p "${HOME}/.zsh" > /dev/null 2>&1

cp "${WUT_CONFIG_LOCATION}/dot/git/gitconfig" "${HOME}/.gitconfig"
cp "${WUT_CONFIG_LOCATION}/dot/nvim/init.lua" "${HOME}/.config/nvim/init.lua"
cp "${WUT_CONFIG_LOCATION}/dot/ssh/config" "${HOME}/.ssh/config"
cp "${WUT_CONFIG_LOCATION}/dot/starship/starship.toml" "${HOME}/.config/starship.toml"
cp "${WUT_CONFIG_LOCATION}/dot/tmux/tmux.conf" "${HOME}/.tmux.conf"
cp "${WUT_CONFIG_LOCATION}/dot/zsh/zshrc" "${HOME}/.zshrc"
cp "${WUT_CONFIG_LOCATION}/dot/zsh/zshenv" "${HOME}/.zshenv"
cp "${WUT_CONFIG_LOCATION}/dot/zsh/zsh/"* "${HOME}/.zsh"

chmod u=rw,g=,o= "${HOME}/.ssh/config" > /dev/null 2>&1
