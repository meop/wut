if type nvim > /dev/null; then
  read yn?'? setup nvim plugin manager [local] (y/N) '
  if [[ "${yn}" == 'y' ]]; then
    _local_share="${XDG_DATA_HOME:-$HOME/.local/share}"
    _nvim="${_local_share}/nvim"

    _output="${_nvim}/site/autoload/plug.vim"
    _url='https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
    runOp curl --fail --location --show-error --silent --url "${_url}" --create-dirs --output "${_output}"
  fi
fi
