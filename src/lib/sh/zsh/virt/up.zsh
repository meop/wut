function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? up instances of docker (system) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        local output="${HOME}/docker-compose-${instance}.yaml"
        local url="${REQ_URL_CFG}/virt/${SYS_HOST}/docker/${instance}.yaml"
        opPrintRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --output "${output}"
        opPrintRunCmd docker compose --file ${output} up --detach
        opPrintRunCmd rm "${output}"
      done
    fi
  fi

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'qemu' ]] && type qemu-system-$(uname -m) > /dev/null; then
    if [[ $YES ]]; then
      yn='y'
    else
      read 'yn?? up instances of qemu (system) [y, [n]] '
    fi
    if [[ $yn != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        echo hi
      done
    fi
  fi
}
