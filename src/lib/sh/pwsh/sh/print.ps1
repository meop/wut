function shPrint {
  if ("${env:SUCCINCT}") {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}

function shPrintErr {
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

function shPrintSucc {
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

function shPrintWarn {
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

function shPrintInfo {
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

function shPrintOp {
  if ("${env:SUCCINCT}") {
    return
  }
  if ("${env:GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Magenta'
  [Console]::Write($args[0])
  if ($args.Length -gt 1) {
    [Console]::Write(' ')
    [Console]::ForegroundColor = 'Cyan'
    [Console]::WriteLine($($($args | Select-Object -Skip 1) -Join ' '))
  }
  [Console]::ResetColor()
}
