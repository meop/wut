if type tmux > /dev/null; then
  TMUX_HOME="${HOME}/.tmux"

  echo -n '> setup tmux plugin manager [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    TMUX_PLUGINS_HOME="${HOME}/.tmux-plugins"

    output="${TMUX_PLUGINS_HOME}/tpm"
    if [[ -d "${output}" ]]; then
      wutLogOp git -C "${output}" pull --prune '> /dev/null 2>&1'
      if [[ -z "${WUT_NO_RUN}" ]]; then
        git -C "${output}" pull --prune > /dev/null 2>&1
      fi
    else
      uri='https://github.com/tmux-plugins/tpm.git'
      wutLogOp git clone -q --depth 1 "${uri}" "${output}"
      if [[ -z "${WUT_NO_RUN}" ]]; then
        git clone -q --depth 1 "${uri}" "${output}"
      fi
    fi
  fi

  echo -n '> setup tmux theme [user]? (y/N) '
  read yn
  if [[ "${yn}" == 'y' ]]; then
    output="${TMUX_HOME}/theme.tmux"
    uri='https://raw.githubusercontent.com/folke/tokyonight.nvim/HEAD/extras/tmux/tokyonight_moon.tmux'
    wutLogOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${WUT_NO_RUN}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
  fi
fi
