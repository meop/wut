function runOp {
  printOp "$@"
  if [[ -z "${NOOP}" ]]; then
    eval "$@"
  fi
}
