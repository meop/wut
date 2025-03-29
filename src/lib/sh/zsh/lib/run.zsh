function runOp {
  echo ${@}
  printOp $@
  if [[ -z "${NOOP}" ]]; then
    eval "$@"
  fi
}
