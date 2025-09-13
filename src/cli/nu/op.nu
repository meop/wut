def opPrint --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  $"($args | str join ' ')" | print
}

def opPrintErr --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print --stderr
    return
  }

  $"(ansi red)($args | str join ' ')(ansi reset)" | print --stderr
}

def opPrintSucc --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print
    return
  }

  $"(ansi green)($args | str join ' ')(ansi reset)" | print
}

def opPrintWarn --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print
    return
  }

  $"(ansi yellow)($args | str join ' ')(ansi reset)" | print
}

def opPrintInfo --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print
    return
  }

  $"(ansi blue)($args | str join ' ')(ansi reset)" | print
}

def opPrintCmd --wrapped [...args] {
  if 'SUCCINCT' in $env {
    return
  }
  if 'GRAYSCALE' in $env {
    $"($args | str join ' ')" | print
    return
  }

  $"(ansi magenta)($args | first)(ansi reset)" | print --no-newline
  if ($args | length) > 1 {
    $" (ansi cyan)($args | skip 1 | str join ' ')(ansi reset)" | print
  }
}

# def opPrintCmdOutput [obj] {
#   # lines will stream line by line
#   # double quotes are needed for newline interpretation
#   # print $in is needed to append final newline when input is a stream
#   $obj | lines | str join "\n" | print $in
# }

def opRunCmd --wrapped [...args] {
  nu --no-config-file -c $"($args | str join ' ')"
}

def opPrintRunCmd --wrapped [...args] {
  opPrintCmd ...$args
  opRunCmd ...$args
}

def opPrintMaybeRunCmd --wrapped [...args] {
  opPrintCmd ...$args
  if 'NOOP' not-in $env {
    opRunCmd ...$args
  }
}
