function print {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  echo $@
}
function printErr {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo $@ >&2
    return
  fi
  echo -n '\033[0;31m' >&2
  echo -n $@ >&2
  echo '\033[0m' >&2
}
function printSucc {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;32m'
  echo -n $@
  echo '\033[0m'
}
function printWarn {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;33m'
  echo -n $@
  echo '\033[0m'
}
function printInfo {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;34m'
  echo -n $@
  echo '\033[0m'
}
function printOp {
  if [[ "${SUCCINCT}" ]]; then
    return
  fi
  if [[ "${GRAYSCALE}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;35m'
  echo -n $1
  shift 1
  if [[ "$@" ]]; then
    echo -n ' '
    echo -n '\033[0;36m'
    echo -n $@
  fi
  echo '\033[0m'
}
