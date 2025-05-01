function opPrint {
  if ($SUCCINCT) {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}

function opPrintErr {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::Error.WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Red'
  [Console]::Error.WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintSucc {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Green'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintWarn {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Yellow'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintInfo {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Blue'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintCmd {
  if ($SUCCINCT) {
    return
  }
  if ($GRAYSCALE) {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Magenta'
  [Console]::Write($args[0])
  [Console]::ResetColor()
  if ($args.Length -gt 1) {
    [Console]::Write(' ')
    [Console]::ForegroundColor = 'Cyan'
    [Console]::WriteLine($($($args | Select-Object -Skip 1) -Join ' '))
    [Console]::ResetColor()
  }
}

function opRunCmd {
  Invoke-Expression "$($args -Join ' ')"
}

function opPrintRunCmd {
  opPrintCmd @args
  if (-not $NOOP) {
    opRunCmd @args
  }
}
