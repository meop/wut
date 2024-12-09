#!/usr/bin/env bash

verMajor=5
verMinor=2

if [ ${BASH_VERSINFO[0]} -lt $verMajor ] || [ ${BASH_VERSINFO[1]} -lt $verMinor ]; then
  echo "checked for Bash >= $verMajor.$verMinor .. found ${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]} .. aborting"
  exit 1
fi

if ! [[ -n "${WUT_LOCATION}" ]]; then
  myPath=$(realpath "$0")
  myDir=$(dirname "${myPath}")
  myParentDir=$(dirname "${myDir}")
  export WUT_LOCATION="${myParentDir}"
fi

if ! type bun > /dev/null; then
  # bun install sets BUN_INSTALL in the running shell profile
  curl --fail --location --show-error --silent 'https://bun.sh/install.sh' | bash
  BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
fi

if [[ "$#" -gt 0 && "$1" == 'up' ]]; then
  # bun upgrade only if it was installed by its own script
  if [[ "${BUN_INSTALL}" && $(which bun) == "${BUN_INSTALL}"* ]]; then
    bun upgrade
  fi

  git -C "${WUT_LOCATION}" pull
fi

owd=$(pwd -P) && cd "${WUT_LOCATION}" || exit

bun run --install=force src/main.ts "$@"

cd "${owd}" || exit
