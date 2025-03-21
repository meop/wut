if type fzf > /dev/null; then
  echo -n '> setup fzf theme [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    FZF_HOME="${HOME}/.fzf"

    output="${FZF_HOME}/colors.zsh"
    uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/fzf/tokyonight_storm.sh'
    wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
  fi
fi
