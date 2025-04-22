function shRunOp {
  Invoke-Expression ($args -Join ' ')
}

function shRunOpCond {
  shPrintOp @args
  if (-not "${env:NOOP}") {
    shRunOp @args
  }
}
