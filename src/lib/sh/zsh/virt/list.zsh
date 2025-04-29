function () {
  local yn

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'docker' ]] && type docker > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? list instances of docker (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        shRunOpCond docker container ls '|' grep --ignore-case "${instance}"
      done
    fi
  fi

  if [[ -z "${VIRT_MANAGER}" || "${VIRT_MANAGER}" == 'qemu' ]] && type qemu-system-$(uname -m) > /dev/null; then
    if [[ "${YES}" ]]; then
      yn='y'
    else
      read 'yn?? list instances of qemu (system) [y, [n]] '
    fi
    if [[ "${yn}" != 'n' ]]; then
      for instance in "${VIRT_INSTANCES[@]}"; do
        shRunOpCond pgrep --ignore-ancestors --full --list-full qemu'.*'"${instance}" '||' echo -n ''\'''\'
      done
    fi
  fi
}
