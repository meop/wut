function dynOp {
  printOp $@
  if [[ -z "${NOOP}" ]]; then
    eval "$@"
  fi
}
