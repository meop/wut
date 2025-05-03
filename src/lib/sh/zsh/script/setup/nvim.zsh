function () {
  local yn=''

  if type nvim > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? setup nvim plugin manager (local) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      local share="${XDG_DATA_HOME:-${HOME}/.local/share}"
      local nvim="${share}/nvim"

      local output="${nvim}/site/autoload/plug.vim"
      local url='https://raw.githubusercontent.com/junegunn/vim-plug/HEAD/plug.vim'
      opPrintMaybeRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --create-dirs --output "${output}"
    fi
  fi
}
