#!/usr/bin/env zsh

(
  if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
    export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
  fi

  echo -n '> run (boot)straps? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    OS_TYPE=$(uname)

    if [[ "$(OS_TYPE)" == 'Darwin' ]]; then
      zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/brew.zsh"
    else
      OS_ID="$(grep -Po '^ID=\K[a-zA-Z0-9._-]+' /etc/os-release)"

      if [[ "${OS_ID}" == 'arch']]; then
        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/yay.zsh"
      fi

      if [[ "${OS_ID}" == 'debian' ]]; then
        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/ms-tools.zsh"
        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/node.zsh"

        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/starship.zsh"
        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/uv.zsh"
        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/zoxide.zsh"

        zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/fonts.zsh"
      fi
    fi

    zsh "${WUT_CONFIG_LOCATION}/strap/zsh/install/bun.zsh"

    zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/fzf.zsh"
    zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/nvim.zsh"
    zsh "${WUT_CONFIG_LOCATION}/strap/zsh/setup/tmux.zsh"
  fi
)
