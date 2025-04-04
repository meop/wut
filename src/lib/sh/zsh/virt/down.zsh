function () {
  local yn

  if [[ "${VIRT_INSTANCES}" ]]; then
    if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
      if [[ "${YES}" ]]; then
        yn='y'
      else
        read yn?'? down containers with docker (system) [[y], n] '
      fi
      if [[ "${yn}" == 'y' ]]; then
        for instance in "${VIRT_INSTANCES[@]}"; do
          local output="${HOME}/docker-compose-${instance}.yml"
          local url="${req_url_cfg}/virt/docker/${sys_host}/${instance}.yaml"
          dynOp curl --fail-with-body --location --silent --url "${url}" --output "${output}"
          dynOp docker compose --file ${output} down
          dynOp rm "${output}"
        done
      fi
    fi
  fi
}
