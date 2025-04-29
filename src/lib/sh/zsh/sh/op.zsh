function opPrint {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  printf "%s\n" "$*"
}

function opPrintErr {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*" >&2
    return
  fi
  printf "\033[0;31m%s\033[0m\n" "$*" >&2
}

function opPrintSucc {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;32m%s\033[0m\n" "$*"
}

function opPrintWarn {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;33m%s\033[0m\n" "$*"
}

function opPrintInfo {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;34m%s\033[0m\n" "$*"
}

function opPrintCmd {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;35m%s\033[0m" "$1"
  shift 1
  if [[ "$*" ]]; then
    printf " \033[0;36m%s\033[0m\n" "$*"
  fi
}

function opRunCmd {
  eval "$*"
}

function opPrintRunCmd {
  opPrintCmd "$@"
  if [[ -z "${NOOP}" ]]; then
    opRunCmd "$@"
  fi
}
