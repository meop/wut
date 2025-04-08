function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? down instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        if docker container ls | grep --ignore-case "${instance}" > /dev/null; then
          local output="${HOME}/docker-compose-${instance}.yaml"
          local url="${req_url_cfg}/virt/${sys_host}/docker/${instance}.yaml"
          runOpCond curl --fail-with-body --location --silent --url "${url}" --output "${output}"
          runOpCond docker compose --file ${output} down
          runOpCond rm "${output}"
        fi
      done
    fi
  fi

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'qemu' ]] && type qemu-system-$(uname -m) > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? down instances of qemu (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        if pgrep --ignore-ancestors --full --list-full qemu.*"${instance}" > /dev/null; then
          runOpCond sudo -E sh -c '"'pkill -f qemu'.*'"${instance}"'"'
        fi
      done
    fi
  fi
}
