# https://www.nushell.sh/book/installation.html#pre-built-binaries
function () {
  if [[ $SYS_OS_PLAT != 'linux' ]]; then
    echo 'script is for linux'
    return
  fi
  if [[ $SYS_OS_LIKE != *'debian'* && $SYS_OS_LIKE != *'rhel'* && $SYS_OS_LIKE != *'suse'* ]]; then
    echo 'script is for debian-like or rhel-like or suse-like'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install nushell (system) [y, [n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  if [[ $SYS_OS_LIKE == *'debian'* ]]; then
    function install_repo {
      local sources_file_path="/etc/apt/sources.list.d/fury-nushell.sources"
      local gpg_file_path='/etc/apt/trusted.gpg.d/fury-nushell.gpg'
      local url='https://apt.fury.io/nushell'
      opPrintMaybeRunCmd sudo --preserve-env bash -c '"'curl --fail-with-body --location --no-progress-meter --url "${url}/gpg.key" '|' gpg --dearmor -o "${gpg_file_path}"'"'
      local apt_lines=(
        'Types: deb'
        'URIs: https://apt.fury.io/nushell/'
        'Suites: /'
        'Components: '
        'Signed-By: /etc/apt/trusted.gpg.d/fury-nushell.gpg'
      )
      opPrintMaybeRunCmd sudo --preserve-env bash -c '"'printf "'""${(j:\n:)apt_lines}"'\n'"'" '>' "${sources_file_path}"'"'
    }
    install_repo
    opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
    opPrintMaybeRunCmd sudo apt install nushell
  elif [[ $SYS_OS_LIKE == *'rhel'* || $SYS_OS_LIKE == *'suse'* ]]; then
    function install_repo {
      local repo_file_path='/etc/yum.repos.d/fury-nushell.repo'
      local url='https://yum.fury.io/nushell'
      local yum_lines=(
        '[gemfury-nushell]'
        'name=Gemfury Nushell Repo'
        'baseurl='"${url}"'/'
        'enabled=1'
        'gpgcheck=0'
        'gpgkey='"${url}"'/gpg.key'
      )
      opPrintMaybeRunCmd sudo --preserve-env bash -c '"'printf "'""${(j:\n:)yum_lines}"'\n'"'" '>' "${repo_file_path}"'"'
    }
    install_repo
    opPrintMaybeRunCmd sudo dnf check-upgrade '>' /dev/null '2>&1'
    opPrintMaybeRunCmd sudo dnf install nushell
  fi
}
