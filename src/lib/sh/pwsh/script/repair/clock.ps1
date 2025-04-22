&{
  if ($IsWindows) {
    if ("${env:YES}") {
      $yn = 'y'
    } else {
      $yn = Read-Host '? repair rtc utc (system) [y, [n]]'
    }
    if ("${yn}" -ne 'n') {
      pwsh -nologo -noprofile -command {
        shRunOpCond Set-Location HKLM:

        $path = '\System\CurrentControlSet\Control\TimeZoneInformation'

        if (-not (Get-ItemProperty $path).RealTimeIsUniversal) {
          shRunOpCond New-ItemProperty $path -Name RealTimeIsUniversal -Value 1 -PropertyType QWord
        } else {
          shRunOpCond Set-ItemProperty $path -Name RealTimeIsUniversal -Value 1
        }

        shRunOpCond Write-Output $path RealTimeIsUniversal (Get-ItemProperty $path).RealTimeIsUniversal
      }
    }
  }
}
