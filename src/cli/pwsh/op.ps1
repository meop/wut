function opPrint {
  if ($SUCCINCT) {
    return
  }
  [Console]::WriteLine($($args -join ' '))
}

function opPrintErr {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::Error.WriteLine($($args -join ' '))
    return
  }
  [Console]::ForegroundColor = 'red'
  [Console]::Error.WriteLine($($args -join ' '))
  [Console]::ResetColor()
}

function opPrintSucc {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -join ' '))
    return
  }
  [Console]::ForegroundColor = 'green'
  [Console]::WriteLine($($args -join ' '))
  [Console]::ResetColor()
}

function opPrintWarn {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -join ' '))
    return
  }
  [Console]::ForegroundColor = 'yellow'
  [Console]::WriteLine($($args -join ' '))
  [Console]::ResetColor()
}

function opPrintInfo {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -join ' '))
    return
  }
  [Console]::ForegroundColor = 'blue'
  [Console]::WriteLine($($args -join ' '))
  [Console]::ResetColor()
}

function opPrintCmd {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -join ' '))
    return
  }
  [Console]::ForegroundColor = 'magenta'
  [Console]::Write($args[0])
  [Console]::ResetColor()
  if ($args.Length -gt 1) {
    [Console]::Write(' ')
    [Console]::ForegroundColor = 'cyan'
    [Console]::WriteLine($($($args | Select-Object -Skip 1) -join ' '))
    [Console]::ResetColor()
  }
}

function opRunCmd {
  Invoke-Expression "$($args -Join ' ')"
}

function opPrintRunCmd {
  opPrintCmd @args
  opRunCmd @args
}

function opPrintMaybeRunCmd {
  opPrintCmd @args
  if (-not $NOOP) {
    opRunCmd @args
  }
}
