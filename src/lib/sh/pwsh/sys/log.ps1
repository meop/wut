function wutLog {
  if ("${WUT_SUCCINCT}") {
    return
  }
  [Console]::WriteLine($($args -Join ' '))
}
function wutLogErr {
  if ("${WUT_SUCCINCT}") {
    return
  }
  if ("${WUT_GRAYSCALE}") {
    [Console]::Error.WriteLine($args)
    return
  }
  [Console]::ForegroundColor = 'Red'
  [Console]::Error.WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}
function wutLogSucc {
  if ("${WUT_SUCCINCT}") {
    return
  }
  if ("${WUT_GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Green'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}
function wutLogWarn {
  if ("${WUT_SUCCINCT}") {
    return
  }
  if ("${WUT_GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Yellow'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}
function wutLogInfo {
  if ("${WUT_SUCCINCT}") {
    return
  }
  if ("${WUT_GRAYSCALE}") {
    [Console]::WriteLine($($args -Join ' '))
    return
  }
  [Console]::ForegroundColor = 'Blue'
  [Console]::WriteLine($($args -Join ' '))
  [Console]::ResetColor()
}
function wutLogOp {
  if ("${WUT_SUCCINCT}") {
    return
  }
  if ("${WUT_GRAYSCALE}") {
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
