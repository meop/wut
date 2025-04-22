function shRunOp {
  eval "$@"
}

function shRunOpCond {
  shPrintOp $@
  if [[ -z "${NOOP}" ]]; then
    shRunOp $@
  fi
}
