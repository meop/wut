function () {
  local yn

  if type fzf > /dev/null; then
    read yn?'? setup fzf theme (user) [y, [n]] '
    if [[ "${yn}" != 'n' ]]; then
      local fzf="${HOME}/.fzf"

      local output="${fzf}/colors.zsh"
      local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
      runOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
