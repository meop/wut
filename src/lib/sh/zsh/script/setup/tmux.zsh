function () {
  local yn

  if type tmux > /dev/null; then
    local tmux="${HOME}/.tmux"

    read yn?'? setup tmux plugin manager (user) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local tmux_plugins="${HOME}/.tmux-plugins"

      local output="${tmux_plugins}/tpm"
      if [[ -d "${output}" ]]; then
        runOpCond git -C "${output}" pull --prune '>' /dev/null '2>&1'
      else
        local url='https://github.com/tmux-plugins/tpm.git'
        runOpCond git clone --depth 1 --quiet "${url}" "${output}"
      fi
    fi

    read yn?'? setup tmux theme (user) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local output="${tmux}/theme.tmux"
      local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/tmux/tokyonight_moon.tmux'
      runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
