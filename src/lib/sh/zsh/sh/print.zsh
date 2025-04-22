function shPrint {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  echo -E $@
}

function shPrintErr {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo -E $@ >&2
    return
  fi
  echo -n '\033[0;31m' >&2
  echo -n -E $@ >&2
  echo '\033[0m' >&2
}

function shPrintSucc {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo -E $@
    return
  fi
  echo -n '\033[0;32m'
  echo -n -E $@
  echo '\033[0m'
}

function shPrintWarn {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo -E $@
    return
  fi
  echo -n '\033[0;33m'
  echo -n -E $@
  echo '\033[0m'
}

function shPrintInfo {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo -E $@
    return
  fi
  echo -n '\033[0;34m'
  echo -n -E $@
  echo '\033[0m'
}

function shPrintOp {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo -E $@
    return
  fi
  echo -n '\033[0;35m'
  echo -n -E $1
  shift 1
  if [[ "$@" ]]; then
    echo -n -E ' '
    echo -n '\033[0;36m'
    echo -n -E $@
  fi
  echo '\033[0m'
}
