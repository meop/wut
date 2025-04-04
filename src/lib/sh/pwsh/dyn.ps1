function dynOp {
  printOp @args
  if (-not "${NOOP}") {
    Invoke-Expression ($args -Join ' ')
  }
}
