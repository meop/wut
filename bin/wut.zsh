#!/usr/bin/env zsh

verMajor=5
verMinor=9

autoload is-at-least
if ! is-at-least "${verMajor}.${verMinor}"; then
  echo "zsh must be >= ${verMajor}.${verMinor} .. found ${ZSH_VERSION} .. aborting" >&2
  exit 1
fi

# subshell to avoid persisting env vars in session
(
  if ! type bun > /dev/null; then
    if [[ -d "${HOME}/.bun" ]]; then
      export BUN_INSTALL="${HOME}/.bun"
      export PATH="${BUN_INSTALL}/bin:${PATH}"
    else
      echo 'bun not found .. aborting' >&2
      exit 1
    fi
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

  if [[ "$#" -gt 0 && "$1" == 'up' ]]; then
    echo "> git -C \'${WUT_CONFIG_LOCATION}\' pull --prune"
    echo
    git -C "${WUT_CONFIG_LOCATION}" pull --prune
    echo

    echo "> git -C \'${WUT_LOCATION}\' pull --prune"
    echo
    git -C "${WUT_LOCATION}" pull --prune
    echo

    # if installed via script
    if [[ "${BUN_INSTALL}" ]]; then
      echo '> bun upgrade'
      bun upgrade
    fi

    owd=$(pwd -P) && cd "${WUT_LOCATION}" || exit
    echo '> bun install'
    bun install
    cd "${owd}" || exit

    exit
  fi

  owd=$(pwd -P) && cd "${WUT_LOCATION}" || exit
  bun run src/cli.ts $@
  cd "${owd}" || exit
)
