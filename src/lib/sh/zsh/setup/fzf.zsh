if type fzf > /dev/null; then
  read yn?'> setup fzf theme [user]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    FZF_HOME="${HOME}/.fzf"

    output="${FZF_HOME}/colors.zsh"
    uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
    logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
  fi
fi
