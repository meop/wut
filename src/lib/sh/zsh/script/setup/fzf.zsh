function () {
  local yn

  if type fzf > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? setup fzf theme (user) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      local fzf="${HOME}/.fzf"

      local output="${fzf}/colors.zsh"
      local url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
      shRunOpCond curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
