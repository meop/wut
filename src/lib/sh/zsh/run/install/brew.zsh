read yn?'? install brew [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  _url='https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh'
  runOp curl --fail --location --show-error --silent --url "${_url}" '|' bash
fi
