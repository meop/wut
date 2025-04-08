function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read yn?'? tidy instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      runOpCond docker system prune --all --volumes
    fi
  fi

  # qemu does not need tidy
}
