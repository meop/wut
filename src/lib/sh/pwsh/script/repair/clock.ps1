&{
  if ($IsWindows) {
    if ($YES) {
      $yn = 'y'
    } else {
      $yn = Read-Host '? repair rtc utc (system) [y, [n]]'
    }
    if ($yn -ne 'n') {
      pwsh -nologo -noprofile -command {
        opPrintRunCmd Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

        if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
          opPrintRunCmd New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
        } else {
          opPrintRunCmd Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
        }

        opPrintRunCmd Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
      }
    }
  }
}
