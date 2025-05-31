function () {
  local yn=''

  if [[ $SYS_OS_PLAT == 'linux' ]]; then
    if [[ $SYS_OS_ID == 'debian' ]]; then
      # docker: <https://docs.docker.com/engine/install/debian/#install-using-the-repository>

      function install_docker_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*download.*docker.*com.*$' > /dev/null; then
          local output_key='/etc/apt/keyrings/docker.asc'
          local url='https://download.docker.com/linux/debian'

          opPrintMaybeRunCmd sudo apt update '> /dev/null 2>&1'
          opPrintMaybeRunCmd sudo apt install ca-certificates curl
          opPrintMaybeRunCmd sudo install -m 0755 -d /etc/apt/keyrings
          opPrintMaybeRunCmd sudo curl --fail-with-body --location --no-progress-meter "${url}"/gpg --output "${output_key}"
          opPrintMaybeRunCmd sudo chmod a+r "${output_key}"

          local output="/etc/apt/sources.list.d/docker.list"
          local arch="$(dpkg --print-architecture)"

          opPrintMaybeRunCmd sudo --preserve-env bash -c '"'echo ''\'deb '['arch="${arch}" signed-by="${output_key}"']' "${url}" "${SYS_OS_VER_CODE}" stable''\' '>' "${output}"'"'
        fi
      }

      if [[ $YES ]]; then
        yn='y'
      else
        read 'yn?? install docker (system) [y, [n]] '
      fi
      if [[ $yn != 'n' ]]; then
        install_docker_repo
        opPrintMaybeRunCmd sudo apt update '> /dev/null 2>&1'
        opPrintMaybeRunCmd sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      fi
    else
      echo 'script is for debian'
    fi
  else
    echo 'script is for linux'
  fi
}
