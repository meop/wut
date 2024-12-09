#!/usr/bin/env bash

verMajor=5
verMinor=2

if [[ ${BASH_VERSINFO[0]} -lt $verMajor ]] || [[ ${BASH_VERSINFO[1]} -lt $verMinor ]]; then
  echo "bash must be >= $verMajor.$verMinor .. found ${BASH_VERSION} .. aborting" >&2
  exit 1
fi

if ! type bun > /dev/null; then
  echo "bun not found .. aborting" >&2
  exit 1
fi
if ! type git > /dev/null; then
  echo "git not found .. aborting" >&2
  exit 1
fi

if ! [[ -n "${BUN_INSTALL}" ]]; then
  BUN_INSTALL="${HOME}/.wut"
fi
if ! [[ -n "${WUT_LOCATION}" ]]; then
  WUT_LOCATION="${HOME}/.wut"
fi

if [[ "$#" -gt 0 && "$1" == 'up' ]]; then
  # bun upgrade only if it was installed by its own script
  if [[ $(which bun) == "${BUN_INSTALL}"* ]]; then
    bun upgrade
  fi

  git -C "${WUT_LOCATION}" fetch --all --tags --prune --prune-tags
  git -C "${WUT_LOCATION}" pull
fi

owd=$(pwd -P)
cd "${WUT_LOCATION}" || exit

bun run --install=force src/main.ts "$@"

cd "${owd}" || exit
