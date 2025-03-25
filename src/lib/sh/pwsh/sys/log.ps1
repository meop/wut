function log {
  if ("${SUCCINCT}") {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}
function logErr {
  if ("${SUCCINCT}") {
    return
  }
  if ("${GRAYSCALE}") {
    [Console]::Error.WriteLine($args)
    return
  }
  [Console]::ForegroundColor = 'Red'
  [Console]::Error.WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}
function logSucc {
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
function logWarn {
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
function logInfo {
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
function logOp {
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
