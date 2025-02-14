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
  if [[ -z "${WUT_LOCATION}" ]]; then
    export WUT_LOCATION="${HOME}/.wut"
  fi
  if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
    export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
  fi

  if [[ "$#" -gt 0 && ( "$1" == 'boot' || "$1" == 'b' || "$1" == 'bs' ) ]]; then
    if [[ "$#" -lt 2 ]]; then
      echo 'no command specified .. aborting' >&2
      exit 1
    fi

    if [[ "$2" == 'list' || "$2" == 'l' || "$2" == '/' || "$2" == 'li' || "$2" == 'ls' ]]; then
      find "${WUT_LOCATION}/boot" -iname '*.zsh'
      exit
    fi

    if [[ "$#" -lt 3 ]]; then
      echo 'no name specified .. aborting' >&2
      exit 1
    fi

    if [[ "$2" == 'run' || "$2" == 'r' || "$2" == '$' || "$2" == 'rn' ]]; then
      zsh "${WUT_LOCATION}/boot/$3.zsh"
      exit
    fi

    exit
  fi

  if [[ "$#" -gt 0 && ( "$1" == 'up' || "$1" == 'u' || "$1" == '^' ) ]]; then
    echo "> git -C '${WUT_LOCATION}' pull --prune"
    git -C "${WUT_LOCATION}" pull --prune > /dev/null 2>&1

    if [[ -d "${WUT_CONFIG_LOCATION}" ]]; then
      echo "> git -C '${WUT_CONFIG_LOCATION}' pull --prune"
      git -C "${WUT_CONFIG_LOCATION}" pull --prune > /dev/null 2>&1
    fi

    if type bun > /dev/null; then
      if [[ "${BUN_INSTALL}" ]]; then
        echo '> bun upgrade'
        bun upgrade
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
