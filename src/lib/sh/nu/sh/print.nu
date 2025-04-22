def shPrint [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  $args | str join ' ' | print
}

def shPrintErr [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  if ('GRAYSCALE' in $env) {
    $args | str join ' ' | print --stderr
    return
  }

  $"(ansi red)($args | str join ' ')(ansi reset)" | print --stderr
}

def shPrintSucc [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  if ('GRAYSCALE' in $env) {
    $args | str join ' ' | print
    return
  }

  $"(ansi green)($args | str join ' ')(ansi reset)" | print
}

def shPrintWarn [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  if ('GRAYSCALE' in $env) {
    $args | str join ' ' | print
    return
  }

  $"(ansi yellow)($args | str join ' ')(ansi reset)" | print
}

def shPrintInfo [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  if ('GRAYSCALE' in $env) {
    $args | str join ' ' | print
    return
  }

  $"(ansi blue)($args | str join ' ')(ansi reset)" | print
}

def shPrintOp [...args] {
  if ('SUCCINCT' in $env) {
    return
  }
  if ('GRAYSCALE' in $env) {
    print $args
    return
  }

  $"(ansi magenta)($args | first)(ansi reset)" | print --no-newline
  if (($args | length) > 1) {
    $" (ansi cyan)($args | skip 1 | str join ' ')(ansi reset)" | print
  }
}
