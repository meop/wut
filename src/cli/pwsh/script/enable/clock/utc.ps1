&{
  if ($IsWindows) {
    $yn = ''
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? enable clock utc (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      opPrintMaybeRunCmd Push-Location 'HKLM:'

      $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

      if (-not ((Get-ItemProperty $path).PSObject.Properties['RealTimeIsUniversal'])) {
        opPrintMaybeRunCmd New-ItemProperty "'${path}'" -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
      } else {
        opPrintMaybeRunCmd Set-ItemProperty "'${path}'" -Name RealTimeIsUniversal -Value 1
      }

      opPrintMaybeRunCmd Write-Output "'${path}'" RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal

      opPrintMaybeRunCmd Pop-Location
    }
  } else {
    Write-Host 'script is for winnt'
  }
}
