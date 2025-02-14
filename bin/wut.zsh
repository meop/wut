#!/usr/bin/env zsh

verMajor=5
verMinor=9

autoload is-at-least
if ! is-at-least "${verMajor}.${verMinor}"; then
  echo "zsh must be >= '${verMajor}.${verMinor}' .. found '${ZSH_VERSION}' .. aborting" >&2
  exit 1
fi

# subshell to avoid persisting env vars in session
(
  if [[ -d "${HOME}/.bun" ]]; then
    export BUN_INSTALL="${HOME}/.bun"
    export PATH="${BUN_INSTALL}/bin:${PATH}"
  fi
  if [[ -z "${WUT_LOCATION}" ]]; then
    export WUT_LOCATION="${HOME}/.wut"
  fi
  if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
    export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
  fi

  if [[ "$#" -gt 0 && ( "$1" == 'load' || "$1" == 'l' ) ]]; then
    if [[ "$#" -lt 2 ]]; then
      echo 'no command specified .. aborting' >&2
      exit 1
    fi

    if [[ "$2" == 'list' || "$2" == 'l' || "$2" == '/' || "$2" == 'li' || "$2" == 'ls' ]]; then
      find "${WUT_LOCATION}/load" -iname '*.zsh'
    fi

    if [[ "$#" -lt 3 ]]; then
      echo 'no name specified .. aborting' >&2
      exit 1
    fi

    if [[ "$2" == 'run' || "$2" == 'r' || "$2" == '$' ]]; then
      zsh "${WUT_LOCATION}/load/$3.zsh"
    fi

    exit
  fi

  if [[ "$#" -gt 0 && ( "$1" == 'up' || "$1" == 'u' ) ]]; then
    echo "> git -C '${WUT_LOCATION}' pull --prune"
    git -C "${WUT_LOCATION}" pull --prune
    echo

    if [[ -d "${WUT_CONFIG_LOCATION}" ]]; then
      echo "> git -C '${WUT_CONFIG_LOCATION}' pull --prune"
      git -C "${WUT_CONFIG_LOCATION}" pull --prune
      echo
    fi

    if type bun > /dev/null; then
      if [[ "${BUN_INSTALL}" ]]; then
        echo '> bun upgrade'
        bun upgrade
        echo
      fi

      pushd "${WUT_LOCATION}"
      echo '> bun install'
      bun install
      popd
    fi

    exit
  fi

  if ! type bun > /dev/null; then
    echo 'bun not found .. aborting' >&2
    exit 1
  fi

  pushd "${WUT_LOCATION}"
  bun run src/cli.ts $@
  popd
)
