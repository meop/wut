function () {
  local yn

  if type fzf > /dev/null; then
    read yn?'? setup fzf theme (user) [[y]/n] '
    if [[ "${yn}" == 'y' ]]; then
      local fzf="${HOME}/.fzf"

      local output="${fzf}/colors.zsh"
      local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
      dynOp curl --location --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
