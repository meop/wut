function wutLog {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  echo $@
}
function wutLogErr {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  if [[ "${WUT_NO_COLOR}" ]]; then
    echo $@ >&2
    return
  fi
  echo -n '\033[0;31m' >&2
  echo -n $@ >&2
  echo '\033[0m' >&2
}
function wutLogSucc {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  if [[ "${WUT_NO_COLOR}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;32m'
  echo -n $@
  echo '\033[0m'
}
function wutLogWarn {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  if [[ "${WUT_NO_COLOR}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;33m'
  echo -n $@
  echo '\033[0m'
}
function wutLogInfo {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  if [[ "${WUT_NO_COLOR}" ]]; then
    echo $@
    return
  fi
  echo -n '\033[0;34m'
  echo -n $@
  echo '\033[0m'
}
function wutLogOp {
  if [[ "${WUT_NO_LOG}" ]]; then
    return
  fi
  if [[ "${WUT_NO_COLOR}" ]]; then
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
