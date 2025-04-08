function runOp {
  Invoke-Expression ($args -Join ' ')
}

function runOpCond {
  printOp @args
  if (-not "${NOOP}") {
    runOp @args
  }
}
