def shRunOp [...args] {
  nu -c $"($args | str join ' ')"
}

def shRunOpCmd [...args] {
  shPrintOp ...$args
  if ('NOOP' not-in $env) {
    shRunOp ...$args
  }
}
