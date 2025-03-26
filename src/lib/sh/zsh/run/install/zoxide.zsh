read yn?'? install zoxide [user] (y/N) '
if [[ "${yn}" == 'y' ]]; then
  _url='https://raw.githubusercontent.com/ajeetdsouza/zoxide/HEAD/install.sh'
  runOp curl --fail --location --show-error --silent --url "${_url}" '|' sh
fi
