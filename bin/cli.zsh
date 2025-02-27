#!/usr/bin/env zsh

verMajor=5
verMinor=9

autoload is-at-least
if ! is-at-least "${verMajor}.${verMinor}"; then
  echo "zsh must be >= '${verMajor}.${verMinor}' .. found '${ZSH_VERSION}' .. aborting" >&2
  exit 1
fi

(
  if [[ -z "${WUT_LOCATION}" ]]; then
    export WUT_LOCATION="${HOME}/.wut"
  fi
  if [[ -z "${WUT_CONFIG_LOCATION}" ]]; then
    export WUT_CONFIG_LOCATION="${HOME}/.wut-config"
  fi

  if ! type bun > /dev/null; then
    echo 'bun not found .. aborting' >&2
    exit 1
  fi

  pushd "${WUT_LOCATION}"
  bun run src/cli.ts $@ | zsh
  popd
)
