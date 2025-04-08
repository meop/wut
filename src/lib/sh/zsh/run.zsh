function runOp {
  eval "$@"
}

function runOpCond {
  printOp $@
  if [[ -z "${NOOP}" ]]; then
    runOp $@
  fi
}
