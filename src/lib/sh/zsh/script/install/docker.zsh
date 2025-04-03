function () {
  local yn

  if [[ "${sys_os_plat}" == 'linux' ]]; then
    if [[ "${sys_os_dist}" == 'debian' ]]; then
      # docker: <https://docs.docker.com/engine/install/debian/#install-using-the-repository>

      function install_docker_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*download.*docker.*com.*$' > /dev/null; then
          local output_key='/etc/apt/keyrings/docker.asc'
          local url='https://download.docker.com/linux/debian'

          dynOp sudo apt-get update
          dynOp sudo apt-get install ca-certificates curl
          dynOp sudo install -m 0755 -d /etc/apt/keyrings
          dynOp sudo curl --fail-with-body --location --silent "${url}"/gpg --output "${output_key}"
          dynOp sudo chmod a+r "${output_key}"

          local output="/etc/apt/sources.list.d/docker.list"
          local arch="$(dpkg --print-architecture)"

          dynOp sudo -E bash -c '"'echo '"'deb '['arch="${arch}" signed-by="${output_key}"']' "${url}" "${sys_os_ver_code}" stable'"' '>' "${output}"'"'
        fi
      }

      read yn?'? install docker (system) [[y], n] '
      if [[ "${yn}" == 'y' ]]; then
        install_docker_repo
        dynOp sudo apt-get update
        dynOp sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      fi
    fi
  fi
}
