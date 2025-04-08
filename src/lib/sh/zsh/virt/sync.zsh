function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? sync instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        local output="${HOME}/docker-compose-${instance}.yaml"
        local url="${req_url_cfg}/virt/${sys_host}/docker/${instance}.yaml"
        runOpCond curl --fail-with-body --location --silent --url "${url}" --output "${output}"
        runOpCond docker compose --file ${output} pull
        runOpCond rm "${output}"
      done
    fi
  fi

  # qemu does not need sync
}
