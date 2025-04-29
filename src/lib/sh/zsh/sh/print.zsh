function shPrint {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  printf "%s\n" "$*"
}

function shPrintErr {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*" >&2
    return
  fi
  printf "\033[0;31m%s\033[0m\n" "$*" >&2
}

function shPrintSucc {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;32m%s\033[0m\n" "$*"
}

function shPrintWarn {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;33m%s\033[0m\n" "$*"
}

function shPrintInfo {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    printf "%s\n" "$*"
    return
  fi
  printf "\033[0;34m%s\033[0m\n" "$*"
}

function shPrintOp {
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
