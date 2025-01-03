#!/usr/bin/env zsh

verMajor=5
verMinor=9

autoload is-at-least
if ! is-at-least "$verMajor.$verMinor"; then
  echo "zsh must be >= $verMajor.$verMinor .. found ${ZSH_VERSION} .. aborting" >&2
  exit 1
fi

if ! type node > /dev/null; then
  echo 'node not found .. aborting' >&2
  exit 1
fi
if ! type git > /dev/null; then
  echo 'git not found .. aborting' >&2
  exit 1
fi

if ! [[ -n "${WUT_CONFIG_LOCATION}" ]]; then
  export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
fi
if ! [[ -n "${WUT_LOCATION}" ]]; then
  export WUT_LOCATION="${HOME}/.wut"
fi

export NODE_NO_WARNINGS=1
export NODE_OPTIONS='--experimental-strip-types --experimental-transform-types'

if [[ "$#" -gt 0 && "$1" == 'up' ]]; then
  echo "> git -C "${WUT_CONFIG_LOCATION}" pull --prune"
  echo
  git -C "${WUT_CONFIG_LOCATION}" pull --prune
  echo

  echo "> git -C "${WUT_LOCATION}" pull --prune"
  echo
  git -C "${WUT_LOCATION}" pull --prune
  echo

  owd=$(pwd -P) && cd "${WUT_LOCATION}" || exit
  echo '> npm install'
  npm install
  cd "${owd}" || exit

  exit
fi

owd=$(pwd -P) && cd "${WUT_LOCATION}" || exit
node src/cli.ts "$@"
cd "${owd}" || exit
