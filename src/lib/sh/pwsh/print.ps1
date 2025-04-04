function print {
  if ("${SUCCINCT}") {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}

function printErr {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
    [Console]::Error.WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Red'
  [Console]::Error.WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function printSucc {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Green'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function printWarn {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Yellow'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function printInfo {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Blue'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}

function printOp {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
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
