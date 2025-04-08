function () {
  local yn

  if [[ "${sys_os_plat}" == 'linux' ]]; then
    if [[ "${sys_os_dist}" == 'debian' ]]; then
      # docker: <https://docs.docker.com/engine/install/debian/#install-using-the-repository>

      function install_docker_repo {
        if ! cat /etc/apt/sources.list /etc/apt/sources.list.d/* | grep --invert-match '^#' | grep --invert-match '^$' | grep '^.*download.*docker.*com.*$' > /dev/null; then
          local output_key='/etc/apt/keyrings/docker.asc'
          local url='https://download.docker.com/linux/debian'

          runOpCond sudo apt-get update
          runOpCond sudo apt-get install ca-certificates curl
          runOpCond sudo install -m 0755 -d /etc/apt/keyrings
          runOpCond sudo curl --fail-with-body --location --silent "${url}"/gpg --output "${output_key}"
          runOpCond sudo chmod a+r "${output_key}"

          local output="/etc/apt/sources.list.d/docker.list"
          local arch="$(dpkg --print-architecture)"

          runOpCond sudo -E bash -c '"'echo '"'deb '['arch="${arch}" signed-by="${output_key}"']' "${url}" "${sys_os_ver_code}" stable'"' '>' "${output}"'"'
        fi
      }

      read yn?'? install docker (system) [y, [n]] '
      if [[ "${yn}" != 'n' ]]; then
        install_docker_repo
        runOpCond sudo apt-get update
        runOpCond sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      fi
    fi
  fi
}
