if type tmux > /dev/null; then
  TMUX_HOME="${HOME}/.tmux"

  read yn?'> setup tmux plugin manager [user]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    TMUX_PLUGINS_HOME="${HOME}/.tmux-plugins"

    output="${TMUX_PLUGINS_HOME}/tpm"
    if [[ -d "${output}" ]]; then
      printOp git -C "${output}" pull --prune '>' /dev/null '2>&1'
      if [[ -z "${NOOP}" ]]; then
        git -C "${output}" pull --prune > /dev/null 2>&1
      fi
    else
      uri='https://github.com/tmux-plugins/tpm.git'
      printOp git clone -q --depth 1 "${uri}" "${output}"
      if [[ -z "${NOOP}" ]]; then
        git clone -q --depth 1 "${uri}" "${output}"
      fi
    fi
  fi

  read yn?'> setup tmux theme [user]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    output="${TMUX_HOME}/theme.tmux"
    uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/tmux/tokyonight_moon.tmux'
    printOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
  fi
fi
