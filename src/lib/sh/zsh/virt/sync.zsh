function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? sync instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        local output="${HOME}/docker-compose-${instance}.yaml"
        local url="${REQ_URL_CFG}/virt/${SYS_HOST}/docker/${instance}.yaml"
        shRunOpCond curl --fail-with-body --location --no-progress-meter --url "${url}" --output "${output}"
        shRunOpCond docker compose --file ${output} pull
        shRunOpCond rm "${output}"
      done
    fi
  fi

  # qemu does not need sync
}
