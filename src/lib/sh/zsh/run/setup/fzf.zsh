if type fzf > /dev/null; then
  read yn?'? setup fzf theme [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _fzf_home="${HOME}/.fzf"

    _output="${_fzf_home}/colors.zsh"
    _url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
    runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${output}"
  fi
fi
