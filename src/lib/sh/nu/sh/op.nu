def opPrint --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  $"($args | str join ' ')" | print --raw
}

def opPrintErr --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --raw --stderr
    return
  }

  $"(ansi red)($args | str join ' ')(ansi reset)" | print --raw --stderr
}

def opPrintSucc --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --raw
    return
  }

  $"(ansi green)($args | str join ' ')(ansi reset)" | print --raw
}

def opPrintWarn --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --raw
    return
  }

  $"(ansi yellow)($args | str join ' ')(ansi reset)" | print --raw
}

def opPrintInfo --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --raw
    return
  }

  $"(ansi blue)($args | str join ' ')(ansi reset)" | print --raw
}

def opPrintCmd --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --raw
    return
  }

  $"(ansi magenta)($args | first)(ansi reset)" | print --no-newline --raw
  if ($args | length) > 1 {
    $" (ansi cyan)($args | skip 1 | str join ' ')(ansi reset)" | print --raw
  }
}

def opRunCmd --wrapped [...args] {
  nu -c $"($args | str join ' ')"
}

def opPrintRunCmd --wrapped [...args] {
  opPrintCmd ...$args
  if 'NOOP' not-in $env {
    opRunCmd ...$args
  }
}
