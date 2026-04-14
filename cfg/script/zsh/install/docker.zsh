# https://docs.docker.com/engine/install/
function () {
  if [[ $SYS_OS_PLAT != 'linux' ]]; then
    echo 'script is for linux'
    return
  fi
  if [[ $SYS_OS != 'debian' && $SYS_OS != 'ubuntu' ]]; then
    echo 'script is for debian/ubuntu'
    return
  fi
  local yn=''
  if [[ $YES ]]; then
    yn='y'
  else
    read 'yn?? install docker (system) [y, [n]]: '
  fi
  if [[ $yn == 'n' ]]; then
    return
  fi
  function install_repo {
    local key_file_path='/etc/apt/keyrings/docker.asc'
    local url="https://download.docker.com/linux/${SYS_OS}"
    opPrintMaybeRunCmd sudo install -m 0755 -d /etc/apt/keyrings
    opPrintMaybeRunCmd sudo curl --fail-with-body --location --no-progress-meter --output "${key_file_path}" --url "${url}"/gpg
    opPrintMaybeRunCmd sudo chmod a+r "${key_file_path}"

    local list_file_path='/etc/apt/sources.list.d/docker.list'
    local arch="$(dpkg --print-architecture)"
    opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo "'"deb '['arch="${arch}" signed-by="${key_file_path}"']' "${url}" "${SYS_OS_VERS_CODE}" stable"'" '>' "${list_file_path}"'"'
  }
  install_repo
  opPrintMaybeRunCmd sudo apt update '>' /dev/null '2>&1'
  opPrintMaybeRunCmd sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}
