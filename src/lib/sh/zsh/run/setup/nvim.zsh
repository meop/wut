if type nvim > /dev/null; then
  read yn?'> setup nvim plugin manager [local]? (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    LOCAL_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}"
    NVIM_DATA="${LOCAL_SHARE}/nvim"

    output="${NVIM_DATA}/site/autoload/plug.vim"
    uri='https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
    logOp curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    if [[ -z "${NOOP}" ]]; then
      curl --fail --location --show-error --silent --url "${uri}" --create-dirs --output "${output}"
    fi
  fi
fi
