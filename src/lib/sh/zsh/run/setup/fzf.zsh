if type fzf > /dev/null; then
  read yn?'? setup fzf theme [user] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    FZF_HOME="${HOME}/.fzf"

    output="${FZF_HOME}/colors.zsh"
    url='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
    printOp curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
fi
