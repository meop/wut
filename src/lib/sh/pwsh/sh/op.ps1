function opPrint {
  if ("${env:SUCCINCT}") {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}

function opPrintErr {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
    [Console]::Error.WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Red'
  [Console]::Error.WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintSucc {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Green'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintWarn {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Yellow'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintInfo {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Blue'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function opPrintCmd {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
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
  Invoke-Expression ($args -Join ' ')
}

function opPrintRunCmd {
  opPrintCmd @args
  if (-not "${env:NOOP}") {
    opRunCmd @args
  }
}
