function () {
  local yn

  if type nvim > /dev/null; then
    read yn?'? setup nvim plugin manager (local) [n/[y]] '
    if [[ "${yn}" == 'y' ]]; then
      local share="${XDG_DATA_HOME:-${HOME}/.local/share}"
      local nvim="${share}/nvim"

      local output="${nvim}/site/autoload/plug.vim"
      local url='https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
      dynOp curl --fail-with-body --location --silent --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
