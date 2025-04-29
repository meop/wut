function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? down instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        if docker container ls | grep --ignore-case "${instance}" > /dev/null; then
          local output="${HOME}/docker-compose-${instance}.yaml"
          local url="${REQ_URL_CFG}/virt/${SYS_HOST}/docker/${instance}.yaml"
          opPrintRunCmd curl --fail-with-body --location --no-progress-meter --url "${url}" --output "${output}"
          opPrintRunCmd docker compose --file ${output} down
          opPrintRunCmd rm "${output}"
        fi
      done
    fi
  fi

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'qemu' ]] && type qemu-system-$(uname -m) > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? down instances of qemu (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        if pgrep --ignore-ancestors --full --list-full qemu.*"${instance}" > /dev/null; then
          opPrintRunCmd sudo -E sh -c '"'pkill -f qemu'.*'"${instance}"'"'
        fi
      done
    fi
  fi
}
