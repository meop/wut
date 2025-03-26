if type tmux > /dev/null; then
  _tmux_home="${HOME}/.tmux"

  read yn?'? setup tmux plugin manager [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _tmux_plugins_home="${HOME}/.tmux-plugins"

    _output="${_tmux_plugins_home}/tpm"
    if [[ -d "${_output}" ]]; then
      runOp git -C "${_output}" pull --prune '>' /dev/null '2>&1'
    else
      _url='https://github.com/tmux-plugins/tpm.git'
      runOp git clone -q --depth 1 "${_url}" "${_output}"
    fi
  fi

  read yn?'? setup tmux theme [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _output="${_tmux_home}/theme.tmux"
    _url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/tmux/tokyonight_moon.tmux'
    runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
  fi
fi
