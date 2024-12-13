#!/usr/bin/env bash

verMajor=5
verMinor=2

if [[ ${BASH_VERSINFO[0]} -lt $verMajor ]] || [[ ${BASH_VERSINFO[1]} -lt $verMinor ]]; then
  echo "bash must be >= $verMajor.$verMinor .. found ${BASH_VERSION} .. aborting" >&2
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

if ! [[ -n "${WUT_LOCATION}" ]]; then
  WUT_LOCATION="${HOME}/.wut"
fi

export NODE_NO_WARNINGS=1
export NODE_OPTIONS='--experimental-strip-types --experimental-transform-types'

if [[ "$#" -gt 0 && "$1" == 'up' ]]; then
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
