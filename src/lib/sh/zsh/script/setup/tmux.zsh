function () {
  local yn=''

  if type tmux > /dev/null; then
    local tmux="${HOME}/.tmux"

    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? setup tmux plugin manager (user) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      local tmux_plugins="${HOME}/.tmux-plugins"

      local output="${tmux_plugins}/tpm"
      if [[ -d "${output}" ]]; then
        opPrintMaybeRunCmd git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://github.com/tmux-plugins/tpm.git'
        opPrintMaybeRunCmd git clone --depth 1 --quiet "${url}" "${output}"
      fi
    fi

    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? setup tmux theme (user) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      local output="${tmux}/theme.tmux"
      local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/tmux/tokyonight_moon.tmux'
      opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
